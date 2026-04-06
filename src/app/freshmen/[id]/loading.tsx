export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="bg-white border-b h-14" />
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="bg-white rounded-xl h-32" />
        <div className="bg-white rounded-xl h-40" />
        <div className="bg-white rounded-xl h-48" />
      </div>
    </div>
  );
}
