import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const state=path.join(dir,'state');fs.mkdirSync(state,{recursive:true});
const file=path.join(process.env.USERPROFILE,'.codex','config.toml');
const backup=path.join(state,'appearance-backup.json');
const mode=process.argv[2];
let text=fs.readFileSync(file,'utf8');
const blocks=text.split(/(?=^\[[^\r\n]+\][ \t]*\r?$)/m);
const dark=b=>/^\[desktop\.appearanceDarkChromeTheme(?:\.|\])/m.test(b);
const desktop=b=>/^\[desktop\][ \t]*\r?$/m.test(b);
if(mode==='apply'){
  if(!fs.existsSync(backup)){
    const main=blocks.find(desktop)||'';
    fs.writeFileSync(backup,JSON.stringify({themeLine:main.match(/^appearanceTheme\s*=.*$/m)?.[0]??null,darkBlocks:blocks.filter(dark)},null,2));
  }
  const kept=blocks.filter(b=>!dark(b)).map(b=>desktop(b)?b.replace(/^appearanceTheme\s*=.*\r?\n?/m,'').replace(/^\[desktop\][ \t]*\r?\n/m,'[desktop]\nappearanceTheme = "dark"\n'):b);
  if(!blocks.some(desktop))kept.push('\n[desktop]\nappearanceTheme = "dark"\n');
  text=kept.join('').trimEnd()+`\n\n[desktop.appearanceDarkChromeTheme]\naccent = "#40e795"\naccentSource = "custom"\ncontrast = 60\nink = "#c8e4d8"\nopaqueWindows = true\nsurface = "#020c09"\n\n[desktop.appearanceDarkChromeTheme.semanticColors]\ndiffAdded = "#39db8c"\ndiffRemoved = "#ec7e83"\nskill = "#65ff94"\n`;
}else if(mode==='restore'){
  if(!fs.existsSync(backup)){console.log('No managed appearance backup.');process.exit(0)}
  const old=JSON.parse(fs.readFileSync(backup,'utf8'));
  text=blocks.filter(b=>!dark(b)).map(b=>desktop(b)?b.replace(/^appearanceTheme\s*=.*\r?\n?/m,'').replace(/^\[desktop\][ \t]*\r?\n/m,'[desktop]\n'+(old.themeLine?old.themeLine+'\n':'')):b).join('').trimEnd()+'\n\n'+old.darkBlocks.join('');
}else throw Error('Unknown config action');
// Write only managed appearance sections; unrelated settings are preserved.
fs.writeFileSync(file,text,'utf8');
console.log('Appearance '+mode+' complete.');
