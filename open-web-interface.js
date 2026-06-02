// 打开Claude Code Web界面的Node.js脚本
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// HTML文件路径
const htmlPath = path.join(__dirname, 'claude-web-interface.html');

// 检查文件是否存在
if (!fs.existsSync(htmlPath)) {
  console.error('错误: HTML文件不存在!');
  process.exit(1);
}

// 根据操作系统使用不同的命令打开文件
const platform = process.platform;
let command;

if (platform === 'win32') {
  // Windows系统
  command = `start "" "${htmlPath}"`;
} else if (platform === 'darwin') {
  // Mac系统
  command = `open "${htmlPath}"`;
} else {
  // Linux和其他系统
  command = `xdg-open "${htmlPath}"`;
}

console.log('正在打开Claude Code Web界面...');
console.log(`文件路径: ${htmlPath}`);
console.log(`使用命令: ${command}`);

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`打开失败: ${error.message}`);
    return;
  }

  console.log('Web界面已启动！请在浏览器中使用系统托盘中的Claude Code Web界面技能。');
  console.log('\n使用步骤:');
  console.log('1. 选择工作目录');
  console.log('2. 选择一个技能');
  console.log('3. 点击"执行技能"按钮');
  console.log('4. 在终端中查看完整交互过程');
});

// 保持脚本运行
process.stdin.resume();