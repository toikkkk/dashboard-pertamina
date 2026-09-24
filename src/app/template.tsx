// Template (bukan layout) dipasang ulang di setiap navigasi, jadi halaman baru masuk
// dengan fade + geser kecil. Murah: hanya opacity dan transform, 280 ms.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-pageIn">{children}</div>;
}
