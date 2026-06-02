from playwright.sync_api import sync_playwright
import sys

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Capture console errors
    console_errors = []
    page.on('console', lambda msg: console_errors.append(f'[{msg.type}] {msg.text}') if msg.type in ('error', 'warning') else None)

    page.goto('https://louisla1.github.io/microcomputer-principles-quiz/')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    # Take screenshot
    page.screenshot(path='D:/claude code/quiz_screenshot.png', full_page=True)
    print('Screenshot saved')

    # Check for console errors
    if console_errors:
        print('\n--- Console errors/warnings ---')
        for e in console_errors[:20]:
            print(e)

    # Check what's on the page
    title = page.title()
    print(f'Page title: {title}')

    # Look for question content
    q_text = page.locator('.q-text').first
    if q_text.count() > 0:
        print(f'Question text found: {q_text.inner_text()[:100]}')
    else:
        print('NO question text found!')

    # Look for options
    opts = page.locator('.option')
    print(f'Options found: {opts.count()}')

    # Look for module chips
    chips = page.locator('.module-chip')
    print(f'Module chips found: {chips.count()}')
    if chips.count() > 0:
        for i in range(min(chips.count(), 8)):
            print(f'  Chip {i}: {chips.nth(i).inner_text()}')

    # Try to click an option
    if opts.count() > 0:
        print('\nClicking first option...')
        opts.first.click()
        page.wait_for_timeout(500)

        # Check if explanation appeared
        exp = page.locator('.explanation.show')
        print(f'Explanation visible: {exp.count() > 0}')

        # Check if correct/wrong indicator appeared
        correct = page.locator('.option.correct')
        wrong = page.locator('.option.wrong')
        print(f'Correct indicators: {correct.count()}')
        print(f'Wrong indicators: {wrong.count()}')

    # Check for any visible error text
    body_text = page.locator('body').inner_text()
    if 'error' in body_text.lower() or 'undefined' in body_text.lower():
        # Print first 500 chars
        print(f'\nBody text (first 500 chars): {body_text[:500]}')

    browser.close()
