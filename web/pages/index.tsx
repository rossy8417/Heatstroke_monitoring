import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>熱見守り 管理コンソール（ダミー）</h1>
      <ul>
        <li><Link href="/alerts">当日アラート一覧</Link></li>
      </ul>
    </main>
  );
}
