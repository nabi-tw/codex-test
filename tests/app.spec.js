import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const grammar = JSON.parse(readFileSync(new URL('../src/grammar.json', import.meta.url), 'utf8'));

test('93項目を読み順で表示し、中国語と例文をすべて保持する', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.grammar-card')).toHaveCount(93);
  await expect(page.locator('.example')).toHaveCount(313);
  const patterns = await page.locator('.card-reading').allTextContents();
  expect(patterns).toEqual([...patterns].sort(new Intl.Collator('ja').compare));
  expect(grammar.every(g => g.meaning && g.examples.length && /^[ぁ-んー]+$/.test(g.reading))).toBe(true);
  expect(grammar.every(g => !JSON.stringify(g).includes('\\\\n'))).toBe(true);
  expect(errors).toEqual([]);
});

test('キーボードで例文を開閉し、接続と補足説明を読む', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('searchbox');
  await search.fill('可能形');
  const card = page.locator('[data-id="N4-G-R012"]');
  const summary = card.locator(':scope > details > summary');
  await expect(card.locator('.examples')).not.toBeVisible();
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(card.locator('.examples')).toBeVisible();
  await expect(card.locator('.example')).toHaveCount(3);
  await expect(card.locator('.examples')).toContainText('私は日本語の新聞が読めます。');
  await expect(card.locator('.connection')).toContainText('書く→書ける');
  await card.locator('.additional > summary').click();
  await expect(card.locator('.additional > p')).toBeVisible();
  await summary.click();
  await expect(card.locator('.examples')).not.toBeVisible();
});

test('漢字の読み・中国語・五十音で検索でき、0件から戻れる', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox').fill('うけみけい');
  await expect(page.locator('.grammar-card')).toHaveCount(3);
  await page.getByRole('searchbox').fill('提前做準備');
  await expect(page.locator('.grammar-card')).toHaveCount(1);
  await expect(page.locator('.grammar-card h4')).toHaveText('〜ておく');
  await page.getByRole('searchbox').fill('存在しない文法ABCXYZ');
  await expect(page.locator('.empty-state')).toBeVisible();
  await page.getByRole('button', {name:'すべての文法を見る'}).click();
  await expect(page.locator('.grammar-card')).toHaveCount(93);
  await page.locator('[data-group="か"]').click();
  const count = grammar.filter(g => g.group === 'か').length;
  await expect(page.locator('.grammar-card')).toHaveCount(count);
  await expect(page.locator('#result-count')).toContainText('か行');
  await page.getByRole('button', {name:'絞り込みをクリア'}).click();
  await expect(page.locator('.grammar-card')).toHaveCount(93);
});

test('文法の保存が再読み込み後も残り、保存一覧から削除できる', async ({ page }) => {
  await page.goto('/');
  const save = page.locator('[data-save="N4-G-R018"]');
  await save.click();
  await expect(save).toHaveAttribute('aria-pressed','true');
  await page.reload();
  await page.getByRole('button', {name:/保存した文法/}).click();
  await expect(page.locator('.grammar-card')).toHaveCount(1);
  await expect(page.locator('.grammar-card h4')).toHaveText('あげる');
  await page.locator('[data-save="N4-G-R018"]').click();
  await expect(page.locator('.empty-state')).toContainText('自分だけの文法ノート');
  await page.reload();
  await expect(page.locator('.nav-count')).toHaveText('0');
});

for (const width of [360,390,768,1280]) {
  test(`${width}pxで横にはみ出さず、文法を開ける`, async ({ page }) => {
    await page.setViewportSize({width,height:900});
    await page.goto('/');
    await page.locator('[data-id="N4-G-R018"] > details > summary').click();
    await expect(page.locator('[data-id="N4-G-R018"] .examples')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({path:`/tmp/kotonoha-${width}.png`,fullPage:false});
  });
}
