export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="bg-white border-b h-14" />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
