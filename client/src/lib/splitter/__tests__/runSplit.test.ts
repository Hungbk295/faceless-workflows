import { describe, expect, test } from 'bun:test';
import { runSplit } from '../runSplit.ts';
import { extractScriptBody } from '../../extractors/script.ts';
import { extractSources, extractResearch } from '../../extractors/sources.ts';
import { splitSentencesText } from '../splitSentences.ts';

const FIXTURE_DIR = new URL('./fixtures/', import.meta.url);

async function loadFixture(name: string): Promise<string> {
  const file = Bun.file(new URL(name, FIXTURE_DIR));
  return await file.text();
}

describe('splitSentencesText', () => {
  test('protects decimals + Vietnamese abbreviations + timestamps', () => {
    const text = 'Tỷ lệ tăng 3.14 phần trăm. Tp. Hồ Chí Minh báo cáo lúc 14:30 chiều. Một câu nữa.';
    const out = splitSentencesText(text, 30, 180);
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(out.join(' ')).toContain('3.14');
    expect(out.join(' ')).toContain('Tp.');
    expect(out.join(' ')).toContain('14:30');
  });

  test('merges fragments shorter than minChar into the previous sentence', () => {
    const out = splitSentencesText('Câu thứ nhất rất dài và đủ điều kiện làm scene riêng. Ngắn.', 30, 180);
    expect(out.length).toBe(1);
  });
});

describe('extractScriptBody', () => {
  test('returns whole text when no SCRIPT heading is present', async () => {
    const fixture = await loadFixture('simple_flat.md');
    expect(extractScriptBody(fixture)).toBe(fixture);
  });

  test('returns body between ## SCRIPT and ## NGUỒN', async () => {
    const fixture = await loadFixture('structured_phan.md');
    const body = extractScriptBody(fixture);
    expect(body.length).toBeLessThan(fixture.length);
    expect(body).toContain('PHẦN 1');
    expect(body).not.toContain('STATS');
  });
});

describe('runSplit', () => {
  test('flat text without SCRIPT heading still produces scenes', async () => {
    const fixture = await loadFixture('simple_flat.md');
    const result = runSplit(fixture);
    expect(result.scenes.length).toBeGreaterThan(0);
    // First scene should be in the default INTRO group since no headings exist
    expect(result.scenes[0]?.level).toBe('[INTRO]');
    // Every scene has a positive duration
    for (const s of result.scenes) {
      expect(s.duration).toBeGreaterThan(0);
      expect(s.chars).toBe(s.vo.length);
      expect(s.words).toBeGreaterThan(0);
    }
  });

  test('strips stage directions, blockquotes, tables, and inline markers', async () => {
    const fixture = await loadFixture('structured_phan.md');
    const result = runSplit(fixture);
    expect(result.scenes.length).toBeGreaterThan(0);

    const allVo = result.scenes.map((s) => s.vo).join(' ');
    expect(allVo).not.toContain('[VISUAL');
    expect(allVo).not.toContain('[B-ROLL');
    expect(allVo).not.toContain('[pause');
    expect(allVo).not.toContain('| Năm |');
    expect(allVo).not.toContain('> **Channel');
    // Section labels should reflect PHẦN heading detection
    const levels = new Set(result.scenes.map((s) => s.level));
    expect(Array.from(levels).some((l) => l.includes('P1'))).toBe(true);
    expect(Array.from(levels).some((l) => l.includes('P2'))).toBe(true);
    // [NHẤN MẠNH: "..."] should be unwrapped to just the inner text
    expect(allVo).toContain('Có những bài học không thể truyền bằng lời');
  });

  test('strips speaker labels (NARRATOR:) and respects custom split params', async () => {
    const fixture = await loadFixture('research_with_sources.md');
    const small = runSplit(fixture, { minChar: 30, maxChar: 80, wpm: 150 });
    const large = runSplit(fixture, { minChar: 30, maxChar: 400, wpm: 150 });
    // Smaller maxChar should yield more scenes (more comma-splits)
    expect(small.scenes.length).toBeGreaterThanOrEqual(large.scenes.length);

    const allVo = small.scenes.map((s) => s.vo).join(' ');
    expect(allVo).not.toMatch(/^NARRATOR:/);
    expect(allVo).toContain('Năm 1928');
    // Total duration matches sum of per-scene durations
    const sum = small.scenes.reduce((a, s) => a + s.duration, 0);
    expect(small.totalDurationSec).toBe(sum);
  });
});

describe('extractSources', () => {
  test('returns [] when there is no NGUỒN section', async () => {
    const fixture = await loadFixture('simple_flat.md');
    expect(extractSources(fixture)).toEqual([]);
  });

  test('parses numbered items + URLs from NGUỒN TRÍCH DẪN', async () => {
    const fixture = await loadFixture('research_with_sources.md');
    const sources = extractSources(fixture);
    expect(sources.length).toBe(3);
    expect(sources[0]?.url).toBe('https://example.org/who-2001');
    expect(sources[0]?.title).toContain('WHO');
    expect(sources[2]?.url).toBe('https://example.org/byt-vn');
  });
});

describe('extractResearch', () => {
  test('returns null when no RESEARCH heading exists', async () => {
    const fixture = await loadFixture('simple_flat.md');
    expect(extractResearch(fixture)).toBeNull();
  });

  test('returns research body up to the next ## SCRIPT/OUTLINE/NGUỒN heading', async () => {
    const fixture = await loadFixture('research_with_sources.md');
    const research = extractResearch(fixture);
    expect(research).not.toBeNull();
    expect(research).toContain('Penicillin');
    expect(research).not.toContain('PHẦN 1');
  });
});
