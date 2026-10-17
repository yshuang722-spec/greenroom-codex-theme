using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using System.Collections.Generic;
using System.Web.Script.Serialization;

internal static class Program
{
    [DllImport("user32.dll")] private static extern bool SetProcessDPIAware();
    private static void Log(string text)
    {
        string path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "state", "tray-startup.log");
        Directory.CreateDirectory(Path.GetDirectoryName(path));
        File.AppendAllText(path, DateTime.Now.ToString("o") + " " + text + Environment.NewLine);
    }

    [STAThread]
    private static void Main(string[] args)
    {
        try { SetProcessDPIAware(); } catch { }
        Log("Main entered");
        bool created;
        Mutex mutex = new Mutex(true, "Local\\GreenRoomThemeTray", out created);
        if (!created)
        {
            mutex.Dispose();
            StopPreviousTrayFromThisFolder();
            mutex = new Mutex(true, "Local\\GreenRoomThemeTray", out created);
        }
        using (mutex)
        {
            Log("Mutex created=" + created);
            if (!created) return;
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            try
            {
                TrayContext context = new TrayContext(args);
                Log("Context created");
                Application.Run();
                Log("Message loop returned");
                GC.KeepAlive(context);
            }
            catch (Exception ex)
            {
                string path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "state", "tray-error.log");
                Directory.CreateDirectory(Path.GetDirectoryName(path));
                File.AppendAllText(path, DateTime.Now.ToString("o") + Environment.NewLine + ex.ToString() + Environment.NewLine);
                Log("Exception logged");
            }
        }
    }

    private static void StopPreviousTrayFromThisFolder()
    {
        string legacyPath = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "GreenRoomTray.exe"));
        foreach (Process candidate in Process.GetProcessesByName("GreenRoomTray"))
        {
            using (candidate)
            {
                try
                {
                    string candidatePath = Path.GetFullPath(candidate.MainModule.FileName);
                    if (!String.Equals(candidatePath, legacyPath, StringComparison.OrdinalIgnoreCase)) continue;
                    Log("Replacing legacy tray instance " + candidate.Id);
                    candidate.Kill();
                    candidate.WaitForExit(5000);
                }
                catch (Exception ex) { Log("Could not replace legacy tray instance: " + ex.Message); }
            }
        }
    }
}
internal sealed class TrayContext : ApplicationContext
{
    private readonly NotifyIcon tray;
    private readonly ToolStripMenuItem enableItem;
    private readonly ToolStripMenuItem disableItem;
    private readonly ToolStripMenuItem startupItem;
    private readonly ToolStripMenuItem exitItem;
    private readonly ContextMenuStrip menu;
    private readonly System.Windows.Forms.Timer pollTimer;
    private readonly System.Windows.Forms.Timer healthTimer;
    private string lastHealthFailure = "";
    private readonly DateTime healthStartedAt = DateTime.UtcNow;
    private Process activeProcess;
    private StringBuilder output;
    private bool activeIsEnable;
    private bool exitWhenDone;
    private readonly string baseDirectory;
    private string StartupLink { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Startup), "Green Room Theme.lnk"); } }

    public TrayContext(string[] args)
    {
        baseDirectory = AppDomain.CurrentDomain.BaseDirectory;
        menu = new ContextMenuStrip();
        menu.RenderMode = ToolStripRenderMode.Professional;
        menu.Renderer = new GreenRoomMenuRenderer();
        menu.Font = new Font("Segoe UI", 10.5F, FontStyle.Regular, GraphicsUnit.Point);
        menu.BackColor = Color.FromArgb(250, 251, 252);
        menu.ForeColor = Color.FromArgb(31, 41, 36);
        menu.Padding = new Padding(6);
        menu.ShowImageMargin = false;
        menu.ShowCheckMargin = true;
        menu.DropShadowEnabled = true;
        enableItem = new ToolStripMenuItem("开启");
        disableItem = new ToolStripMenuItem("关闭");
        startupItem = new ToolStripMenuItem("开机自启动");
        exitItem = new ToolStripMenuItem("退出主题");
        StyleMenuItem(enableItem);
        StyleMenuItem(disableItem);
        StyleMenuItem(startupItem);
        StyleMenuItem(exitItem);
        startupItem.CheckOnClick = true;
        startupItem.Checked = File.Exists(StartupLink);
        enableItem.Click += delegate { RunThemeAction(true); };
        disableItem.Click += delegate { RunThemeAction(false); };
        startupItem.Click += ToggleStartup;
        exitItem.Click += RequestExit;
        menu.Items.Add(enableItem);
        menu.Items.Add(disableItem);
        ToolStripSeparator separator = new ToolStripSeparator();
        separator.Height = 1;
        separator.Margin = new Padding(12, 4, 12, 4);
        menu.Items.Add(separator);
        menu.Items.Add(startupItem);
        ToolStripSeparator exitSeparator = new ToolStripSeparator();
        exitSeparator.Height = 1;
        exitSeparator.Margin = new Padding(12, 4, 12, 4);
        menu.Items.Add(exitSeparator);
        menu.Items.Add(exitItem);
        menu.Opened += delegate { ApplyWindows11Corners(menu.Handle); };

        string iconPath = Path.Combine(baseDirectory, "assets", "Codex-Terminal-Tray.ico");
        tray = new NotifyIcon();
        tray.Icon = new Icon(iconPath);
        tray.Text = "Green Room · Codex 主题";
        tray.ContextMenuStrip = menu;
        tray.Visible = true;
        tray.BalloonTipTitle = "Green Room";
        menu.Opening += delegate { UpdateMenu(); };
        pollTimer = new System.Windows.Forms.Timer();
        pollTimer.Interval = 500;
        pollTimer.Tick += PollProcess;
        healthTimer = new System.Windows.Forms.Timer();
        healthTimer.Interval = 5000;
        healthTimer.Tick += delegate { PollHealth(); };
        healthTimer.Start();
        UpdateMenu();

        bool autoEnable = Array.Exists(args, delegate(string arg) { return String.Equals(arg, "--autostart", StringComparison.OrdinalIgnoreCase); });
        if (autoEnable)
        {
            System.Windows.Forms.Timer oneShot = new System.Windows.Forms.Timer();
            oneShot.Interval = 1200;
            oneShot.Tick += delegate { oneShot.Stop(); oneShot.Dispose(); RunThemeAction(true, true); };
            oneShot.Start();
        }
    }

    private void UpdateMenu()
    {
        bool busy = activeProcess != null && !activeProcess.HasExited;
        bool themeActive = false;
        try {
            string state = File.ReadAllText(Path.Combine(baseDirectory, "state", "last-status.json"));
            themeActive = File.Exists(Path.Combine(baseDirectory, "state", "theme-enabled"));
        } catch { }
        enableItem.Checked = themeActive;
        disableItem.Checked = !themeActive;
        enableItem.Enabled = !busy;
        disableItem.Enabled = !busy;
        startupItem.Enabled = !busy;
        exitItem.Enabled = !busy;
        string phase, message;
        ReadHealth(out phase, out message);
        tray.Text = busy ? "Green Room · 正在切换主题" : !themeActive ? "Green Room · 主题已关闭" :
            phase == "incompatible" ? "Green Room · 客户端版本不兼容" :
            phase == "degraded" ? "Green Room · 部分功能不可用" :
            phase == "loading-failed" ? "Green Room · 主题加载失败" :
            phase == "monitor-unavailable" ? "Green Room · 功能检测未更新" :
            phase == "waiting-for-client" ? "Green Room · 等待 Codex 启动" : "Green Room · Codex 主题";
    }

    private void ReadHealth(out string phase, out string message)
    {
        phase = "waiting-for-client";
        message = "主题监视已开启，等待 Codex 启动。";
        try
        {
            string path = Path.Combine(baseDirectory, "state", "compatibility-status.json");
            if (!File.Exists(path))
            {
                if (DateTime.UtcNow - healthStartedAt > TimeSpan.FromSeconds(120))
                {
                    phase = "monitor-unavailable";
                    message = "未收到主题功能检测结果，请从托盘重新开启主题。";
                }
                return;
            }
            var data = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(File.ReadAllText(path));
            if (data.ContainsKey("state")) phase = Convert.ToString(data["state"]);
            if (data.ContainsKey("message")) message = Convert.ToString(data["message"]);
            DateTime checkedAt;
            if (data.ContainsKey("checkedAt") && DateTime.TryParse(Convert.ToString(data["checkedAt"]), out checkedAt) &&
                DateTime.UtcNow - checkedAt.ToUniversalTime() > TimeSpan.FromSeconds(120))
            {
                phase = "monitor-unavailable";
                message = "主题功能检测已超过两分钟未更新，请从托盘重新开启主题。";
            }
        }
        catch { phase = "loading-failed"; message = "无法读取主题功能检测结果，请从托盘重新开启主题。"; }
    }

    private void PollHealth()
    {
        UpdateMenu();
        if (!File.Exists(Path.Combine(baseDirectory, "state", "theme-enabled"))) { lastHealthFailure = ""; return; }
        if (activeProcess != null) return;
        string phase, message;
        ReadHealth(out phase, out message);
        if (phase == "active") { lastHealthFailure = ""; return; }
        if (phase != "incompatible" && phase != "degraded" && phase != "loading-failed") return;
        string key = phase + ":" + message;
        if (key == lastHealthFailure) return;
        lastHealthFailure = key;
        ShowTip(message);
    }

    private void ShowTip(string message)
    {
        tray.BalloonTipText = message.Length > 240 ? message.Substring(0, 237) + "..." : message;
        tray.ShowBalloonTip(3500);
    }

    private void RunThemeAction(bool enable, bool backgroundOnly = false)
    {
        if (activeProcess != null && !activeProcess.HasExited)
        {
            exitWhenDone = false;
            ShowTip("主题操作正在进行中。");
            return;
        }
        string themeScript = Path.Combine(baseDirectory, "Theme.ps1");
        if (!File.Exists(themeScript))
        {
            exitWhenDone = false;
            ShowTip("找不到主题文件，请将此应用放回 GreenRoom 文件夹。");
            return;
        }
        activeIsEnable = enable;
        output = new StringBuilder();
        string powershell = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "WindowsPowerShell\\v1.0\\powershell.exe");
        ProcessStartInfo info = new ProcessStartInfo();
        info.FileName = powershell;
        info.Arguments = "-NoProfile -ExecutionPolicy Bypass -File \"" + themeScript + "\" -Action " + (enable ? (backgroundOnly ? "Enable -BackgroundOnly" : "Enable -WaitForClose") : "Restore");
        info.WorkingDirectory = baseDirectory;
        info.UseShellExecute = false;
        info.CreateNoWindow = true;
        info.RedirectStandardOutput = true;
        info.RedirectStandardError = true;
        try
        {
            activeProcess = new Process();
            activeProcess.StartInfo = info;
            activeProcess.EnableRaisingEvents = true;
            activeProcess.OutputDataReceived += CaptureOutput;
            activeProcess.ErrorDataReceived += CaptureOutput;
            activeProcess.Start();
            activeProcess.BeginOutputReadLine();
            activeProcess.BeginErrorReadLine();
            UpdateMenu();
            if (enable) ShowTip("正在开启主题；如 Codex 尚未使用主题启动，请完全退出客户端以继续。");
            else ShowTip("正在关闭主题并恢复外观设置。");
            pollTimer.Start();
        }
        catch (Exception ex)
        {
            exitWhenDone = false;
            activeProcess = null;
            UpdateMenu();
            ShowTip("无法运行主题脚本：" + ex.Message);
        }
    }

    private void CaptureOutput(object sender, DataReceivedEventArgs e)
    {
        if (e.Data != null && output != null) lock (output) output.AppendLine(e.Data);
    }

    private void PollProcess(object sender, EventArgs e)
    {
        if (activeProcess == null || !activeProcess.HasExited) return;
        pollTimer.Stop();
        activeProcess.WaitForExit();
        int exitCode = activeProcess.ExitCode;
        bool shouldExit = exitWhenDone;
        exitWhenDone = false;
        string details;
        lock (output) details = output.ToString();
        activeProcess.Dispose();
        activeProcess = null;
        UpdateMenu();
        if (exitCode == 0 && shouldExit) { ShutdownTray(); return; }
        if (exitCode == 0)
        {
            string phase, message;
            ReadHealth(out phase, out message);
            if (!activeIsEnable) ShowTip("绿室主题已关闭，原外观已恢复。");
            else if (phase != "monitor-unavailable") ShowTip(message);
        }
        else
        {
            string message = "主题操作失败，请检查 GreenRoom/state 目录。";
            if (!String.IsNullOrWhiteSpace(details))
            {
                string[] lines = details.Trim().Split(new char[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                if (lines.Length > 0) message = lines[lines.Length - 1];
            }
            string phase, healthMessage;
            ReadHealth(out phase, out healthMessage);
            ShowTip(phase == "incompatible" || phase == "loading-failed" ? healthMessage : message);
        }
    }

    private void ToggleStartup(object sender, EventArgs e)
    {
        bool enable = startupItem.Checked;
        try
        {
            if (enable)
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                dynamic shell = Activator.CreateInstance(shellType);
                dynamic shortcut = shell.CreateShortcut(StartupLink);
                shortcut.TargetPath = Application.ExecutablePath;
                shortcut.Arguments = "--autostart";
                shortcut.WorkingDirectory = baseDirectory;
                shortcut.Description = "Start Green Room theme with Windows";
                shortcut.IconLocation = Application.ExecutablePath + ",0";
                shortcut.Save();
                if (!File.Exists(StartupLink)) throw new IOException("Startup shortcut was not created.");
                ShowTip("开机自启动已开启；登录 Windows 后会自动启动 Codex 主题。");
            }
            else
            {
                if (File.Exists(StartupLink)) File.Delete(StartupLink);
                ShowTip("开机自启动已关闭。");
            }
        }
        catch (Exception ex)
        {
            startupItem.Checked = !enable;
            ShowTip("无法更改开机自启动：" + ex.Message);
        }
        UpdateMenu();
    }

    private void RequestExit(object sender, EventArgs e)
    {
        if (activeProcess != null && !activeProcess.HasExited)
        {
            ShowTip("主题操作完成后才能退出。");
            return;
        }
        exitWhenDone = true;
        RunThemeAction(false);
    }

    private void ShutdownTray()
    {
        pollTimer.Stop();
        healthTimer.Stop();
        tray.Visible = false;
        tray.Dispose();
        menu.Dispose();
        pollTimer.Dispose();
        healthTimer.Dispose();
        Application.ExitThread();
    }

    private static void StyleMenuItem(ToolStripMenuItem item)
    {
        item.AutoSize = false;
        float scale;
        using (Graphics graphics = Graphics.FromHwnd(IntPtr.Zero)) scale = graphics.DpiY / 96F;
        item.Size = new Size((int)Math.Round(224 * scale), (int)Math.Round(36 * scale));
        item.Margin = new Padding(1, 0, 1, 0);
        item.Padding = new Padding((int)(14*scale), (int)(4*scale), (int)(10*scale), (int)(4*scale));
        item.TextAlign = ContentAlignment.MiddleLeft;
        item.Font = new Font("Segoe UI", 10.5F, FontStyle.Regular, GraphicsUnit.Point);
        item.ForeColor = Color.FromArgb(31, 41, 36);
        item.BackColor = Color.FromArgb(250, 251, 252);
    }

    private static void ApplyWindows11Corners(IntPtr handle)
    {
        try
        {
            int preference = 2; // DWMWCP_ROUND
            DwmSetWindowAttribute(handle, 33, ref preference, sizeof(int)); // DWMWA_WINDOW_CORNER_PREFERENCE
        }
        catch { /* Older Windows builds keep the menu's clean square border. */ }
    }

    [DllImport("dwmapi.dll", PreserveSig = true)]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int valueSize);

    private sealed class GreenRoomMenuRenderer : ToolStripProfessionalRenderer
    {
        private static readonly Color Surface = Color.FromArgb(250, 251, 252);
        private static readonly Color Hover = Color.FromArgb(235, 244, 238);
        private static readonly Color Border = Color.FromArgb(222, 229, 225);

        public GreenRoomMenuRenderer() : base(new GreenRoomMenuColors()) { RoundedEdges = true; }

        protected override void OnRenderToolStripBackground(ToolStripRenderEventArgs e)
        {
            e.Graphics.Clear(Surface);
        }

        protected override void OnRenderMenuItemBackground(ToolStripItemRenderEventArgs e)
        {
            if (!e.Item.Selected || !e.Item.Enabled) return;
            Rectangle bounds = new Rectangle(3, 1, e.Item.Width - 6, e.Item.Height - 2);
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using (GraphicsPath path = RoundedRectangle(bounds, 7))
            using (SolidBrush brush = new SolidBrush(Hover))
                e.Graphics.FillPath(brush, path);
        }

        protected override void OnRenderItemCheck(ToolStripItemImageRenderEventArgs e)
        {
            Rectangle row = e.Item.Bounds;
            Rectangle slot = e.ImageRectangle;
            int centerX = slot.Width > 0 ? slot.Left + slot.Width / 2 : row.Left + 22;
            int x = centerX - 6;
            int y = (e.Item.Height - 12) / 2;
            SmoothingMode previous = e.Graphics.SmoothingMode;
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using (Pen pen = new Pen(Color.FromArgb(38, 151, 94), 2.2F))
            {
                pen.StartCap = LineCap.Round;
                pen.EndCap = LineCap.Round;
                pen.LineJoin = LineJoin.Round;
                e.Graphics.DrawLines(pen, new Point[] {
                    new Point(x, y + 6), new Point(x + 4, y + 10), new Point(x + 12, y + 2)
                });
            }
            e.Graphics.SmoothingMode = previous;
        }

        protected override void OnRenderSeparator(ToolStripSeparatorRenderEventArgs e)
        {
            int y = e.Item.Height / 2;
            using (Pen pen = new Pen(Border))
                e.Graphics.DrawLine(pen, 14, y, e.Item.Width - 14, y);
        }

        protected override void OnRenderToolStripBorder(ToolStripRenderEventArgs e)
        {
            if (e.ToolStrip.Width < 2 || e.ToolStrip.Height < 2) return;
            Rectangle bounds = new Rectangle(0, 0, e.ToolStrip.Width - 1, e.ToolStrip.Height - 1);
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using (GraphicsPath path = RoundedRectangle(bounds, 9))
            using (Pen pen = new Pen(Border))
                e.Graphics.DrawPath(pen, path);
        }

        private static GraphicsPath RoundedRectangle(Rectangle bounds, int radius)
        {
            int diameter = radius * 2;
            GraphicsPath path = new GraphicsPath();
            path.AddArc(bounds.Left, bounds.Top, diameter, diameter, 180, 90);
            path.AddArc(bounds.Right - diameter, bounds.Top, diameter, diameter, 270, 90);
            path.AddArc(bounds.Right - diameter, bounds.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(bounds.Left, bounds.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            return path;
        }
    }

    private sealed class GreenRoomMenuColors : ProfessionalColorTable
    {
        public override Color ToolStripDropDownBackground { get { return Color.FromArgb(250, 251, 252); } }
        public override Color MenuBorder { get { return Color.FromArgb(222, 229, 225); } }
        public override Color MenuItemSelected { get { return Color.FromArgb(235, 244, 238); } }
        public override Color MenuItemBorder { get { return Color.FromArgb(220, 233, 224); } }
        public override Color CheckBackground { get { return Color.FromArgb(235, 244, 238); } }
        public override Color CheckSelectedBackground { get { return Color.FromArgb(235, 244, 238); } }
        public override Color CheckPressedBackground { get { return Color.FromArgb(235, 244, 238); } }
        public override Color SeparatorDark { get { return Color.FromArgb(222, 229, 225); } }
        public override Color SeparatorLight { get { return Color.FromArgb(250, 251, 252); } }
        public override Color ImageMarginGradientBegin { get { return Color.FromArgb(250, 251, 252); } }
        public override Color ImageMarginGradientMiddle { get { return Color.FromArgb(250, 251, 252); } }
        public override Color ImageMarginGradientEnd { get { return Color.FromArgb(250, 251, 252); } }
    }
}
