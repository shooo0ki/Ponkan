export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="bg-white border-b h-14" />
      <div className="flex">
        <div className="w-64 bg-white border-r min-h-screen" />
        <div className="flex-1 p-4 space-y-4">
          <div className="h-32 bg-white rounded-xl" />
          <div className="h-48 bg-white rounded-xl" />
        </div>
      </div>
    </div>
  );
}
