import sys
import os
import subprocess
import tempfile
from pathlib import Path

def convert_pdf_to_images(pdf_path):
    """将PDF转换为图片"""
    try:
        # 使用pdftoppm将PDF转换为图片
        output_dir = tempfile.mkdtemp()
        print(f"创建临时目录: {output_dir}")

        # 转换为PNG图片
        cmd = ['pdftoppm', '-png', '-r', '150', pdf_path, os.path.join(output_dir, 'page')]
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')

        if result.returncode != 0:
            print(f"pdftoppm错误: {result.stderr}")
            return []

        # 获取生成的图片文件
        png_files = sorted(Path(output_dir).glob('page-*.png'))
        return [str(f) for f in png_files], output_dir
    except Exception as e:
        print(f"PDF转图片失败: {e}")
        return [], ""

def extract_text_with_tesseract(image_paths, output_dir):
    """使用tesseract进行OCR识别"""
    all_text = ""

    for i, img_path in enumerate(image_paths):
        print(f"处理第 {i+1}/{len(image_paths)} 页...")

        # 使用tesseract提取文本
        output_file = os.path.join(output_dir, f'page_{i+1}')
        cmd = ['tesseract', img_path, output_file, '-l', 'chi_sim', '--psm', '6']

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
            if result.returncode == 0:
                txt_file = output_file + '.txt'
                if os.path.exists(txt_file):
                    with open(txt_file, 'r', encoding='utf-8') as f:
                        all_text += f.read() + '\n\n'
            else:
                print(f"tesseract错误: {result.stderr}")
        except Exception as e:
            print(f"处理图片 {img_path} 时出错: {e}")

    return all_text

def extract_pdf_text_ocr(pdf_path):
    """使用OCR提取PDF文本（针对扫描版PDF）"""
    print(f"开始处理扫描版PDF: {pdf_path}")

    # 1. 安装必要的包
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pytesseract", "Pillow"])
    except Exception as e:
        print(f"安装包失败: {e}")
        print("请手动安装: pip install pytesseract pillow")

    # 2. 检查工具是否可用
    tools_missing = []
    for tool in ['pdftoppm', 'tesseract']:
        try:
            subprocess.run([tool, '--version'], capture_output=True)
        except FileNotFoundError:
            tools_missing.append(tool)

    if tools_missing:
        return f"缺少必要的OCR工具: {', '.join(tools_missing)}\n请安装: Windows用户可安装poppler-utils和tesseract"

    # 3. 转换为图片
    print("将PDF转换为图片...")
    image_paths, temp_dir = convert_pdf_to_images(pdf_path)

    if not image_paths:
        return "无法将PDF转换为图片"

    print(f"生成了 {len(image_paths)} 张图片")

    # 4. OCR识别
    print("进行OCR识别...")
    text = extract_text_with_tesseract(image_paths, temp_dir)

    # 5. 清理临时文件
    try:
        for img in image_paths:
            os.remove(img)
        for txt in Path(temp_dir).glob('*.txt'):
            os.remove(str(txt))
        os.rmdir(temp_dir)
    except:
        pass

    return text

def save_questions_to_markdown(text, output_path):
    """将识别的文本保存为markdown格式"""
    if not text.strip():
        return 0

    # 简单的题目提取逻辑
    lines = text.split('\n')

    # 创建markdown内容
    md_content = "# 微机学习通题目\n\n"
    md_content += "## OCR识别的题目内容\n\n"

    # 添加原始文本（稍后可以手动整理）
    md_content += "```\n"
    md_content += text
    md_content += "\n```\n\n"

    # 尝试自动识别题目
    md_content += "## 识别出的题目\n\n"

    question_count = 0
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue

        # 简单的题目检测
        if (any(line.startswith(f'{num}.') for num in range(1, 100)) or
            '?' in line or '？' in line or
            len(line) > 10 and '的' in line and ('是' in line or '什么' in line)):
            question_count += 1
            md_content += f"### 题目 {question_count}\n\n{line}\n\n"
        elif line.startswith(('A', 'B', 'C', 'D', '正确', '错误', '对', '错')):
            md_content += f"- {line}\n"

    if question_count == 0:
        md_content += "（未能自动识别出结构化题目，请查看上方原始文本）\n"

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(md_content)

    return question_count

def main():
    pdf_path = r"D:\claude code\微机学习通.pdf"
    output_path = r"D:\claude code\微机学习通题目_ocr.md"

    if not os.path.exists(pdf_path):
        print(f"PDF文件不存在: {pdf_path}")
        return

    # 先用标准方法试试
    try:
        result = subprocess.run(['pdftotext', pdf_path, '-'],
                               capture_output=True, text=True, encoding='utf-8', timeout=10)
        if result.stdout and len(result.stdout.strip()) > 100:
            print("使用pdftotext成功提取文本")
            text = result.stdout
        else:
            print("pdftotext提取内容过少，尝试OCR...")
            text = extract_pdf_text_ocr(pdf_path)
    except Exception as e:
        print(f"标准提取失败: {e}")
        text = extract_pdf_text_ocr(pdf_path)

    if text and len(text.strip()) > 0:
        print(f"提取到文本，长度: {len(text)} 字符")

        # 保存原始文本
        with open(r"D:\claude code\微机学习通_ocr原始文本.txt", 'w', encoding='utf-8') as f:
            f.write(text)

        # 保存为markdown
        question_count = save_questions_to_markdown(text, output_path)
        print(f"保存到: {output_path}")
        print(f"识别的题目数量: {question_count}")
        print("\n注意: OCR识别可能不完美，请检查markdown文件并手动整理")
    else:
        print("无法提取文本")

    # 检查工具是否可用指南
    print("\n" + "="*60)
    print("如果OCR失败，请检查以下工具是否安装:")
    print("1. poppler-utils (包含pdftoppm等工具)")
    print("2. tesseract-ocr (OCR引擎)")
    print("3. tesseract-ocr-chi-sim (中文语言包)")
    print("\nWindows安装方法:")
    print("- poppler: 从 https://github.com/oschwartz10612/poppler-windows/releases 下载")
    print("- tesseract: 从 https://github.com/UB-Mannheim/tesseract/wiki 下载")
    print("="*60)

if __name__ == "__main__":
    main()