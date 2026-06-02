import sys
import os
import subprocess

def extract_pdf_with_pypdf2(pdf_path):
    """使用PyPDF2提取PDF文本"""
    try:
        import PyPDF2
        text = ""
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            num_pages = len(pdf_reader.pages)
            for i in range(num_pages):
                page = pdf_reader.pages[i]
                text += page.extract_text() + "\n\n"
        return text
    except Exception as e:
        return f"PyPDF2提取失败: {e}"

def extract_pdf_with_pdfminer(pdf_path):
    """使用pdfminer提取PDF文本"""
    try:
        from io import StringIO
        from pdfminer.high_level import extract_text_to_fp
        from pdfminer.layout import LAParams

        output_string = StringIO()
        with open(pdf_path, 'rb') as file:
            extract_text_to_fp(file, output_string, laparams=LAParams())
        return output_string.getvalue()
    except Exception as e:
        return f"pdfminer提取失败: {e}"

def extract_pdf_with_tesseract(pdf_path):
    """使用OCR提取PDF文本（适用于扫描版PDF）"""
    try:
        # 先尝试用pdftotext提取
        result = subprocess.run(['pdftotext', pdf_path, '-'],
                              capture_output=True, text=True, encoding='utf-8')
        if result.stdout:
            return result.stdout
        else:
            return f"pdftotext失败: {result.stderr}"
    except Exception as e:
        return f"pdftotext提取失败: {e}"

def extract_pdf_text(pdf_path):
    """尝试多种方法提取PDF文本"""
    text = ""

    # 方法1: 尝试安装并导入PyPDF2
    try:
        print("尝试安装PyPDF2...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "PyPDF2"])
        text = extract_pdf_with_pypdf2(pdf_path)
        if text and not text.startswith("PyPDF2提取失败"):
            return text
    except Exception as e:
        print(f"PyPDF2安装/提取失败: {e}")

    # 方法2: 尝试安装并导入pdfminer.six
    try:
        print("尝试安装pdfminer.six...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pdfminer.six"])
        text = extract_pdf_with_pdfminer(pdf_path)
        if text and not text.startswith("pdfminer提取失败"):
            return text
    except Exception as e:
        print(f"pdfminer.six安装/提取失败: {e}")

    # 方法3: 尝试使用命令行工具
    try:
        print("尝试使用命令行工具pdftotext...")
        text = extract_pdf_with_tesseract(pdf_path)
        if text and not text.startswith("pdftotext提取失败"):
            return text
    except Exception as e:
        print(f"命令行工具失败: {e}")

    return "所有提取方法都失败了"

def save_to_markdown(text, output_path):
    """保存为markdown文件"""
    # 简单处理文本，尝试识别题目
    lines = text.split('\n')
    questions = []
    current_question = ""

    # 简化的题目识别逻辑
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue

        # 检测题目编号（1. 2. 3. 或 一、二、等）
        if line.startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '0.')) or \
           line.startswith(('一、', '二、', '三、', '四、', '五、', '六、', '七、', '八、', '九、', '十、')):
            if current_question:
                questions.append(current_question)
            current_question = line + "\n"
        elif line.startswith(('A.', 'B.', 'C.', 'D.', 'E.', 'a.', 'b.', 'c.', 'd.', 'e.')):
            current_question += line + "\n"
        elif current_question:
            current_question += line + "\n"

    if current_question:
        questions.append(current_question)

    # 如果没有识别到结构化题目，保存原始文本
    if not questions:
        questions = [text]

    # 创建markdown内容
    md_content = "# 微机学习通题目\n\n"
    for i, q in enumerate(questions):
        md_content += f"## 题目 {i+1}\n\n{q}\n\n"

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(md_content)

    return len(questions)

if __name__ == "__main__":
    pdf_path = r"D:\claude code\微机学习通.pdf"
    output_path = r"D:\claude code\微机学习通题目.md"

    if not os.path.exists(pdf_path):
        print(f"PDF文件不存在: {pdf_path}")
        sys.exit(1)

    print(f"正在提取PDF文件: {pdf_path}")
    text = extract_pdf_text(pdf_path)

    if text and text != "所有提取方法都失败了":
        print(f"提取到文本，长度: {len(text)} 字符")

        # 保存原始文本
        with open(r"D:\claude code\微机学习通原始文本.txt", 'w', encoding='utf-8') as f:
            f.write(text)

        # 提取题目并保存为markdown
        question_count = save_to_markdown(text, output_path)
        print(f"提取了 {question_count} 个题目，保存到: {output_path}")
    else:
        print("无法提取PDF文本")