export default function Loading() {
    return (
        <div className="min-h-screen bg-white animate-page-in max-w-md mx-auto">
            <div className="p-6 pt-12 flex items-center gap-3 border-b border-gray-50">
                <div className="w-10 h-10 bg-gray-100 rounded-full animate-pulse" />
                <div className="space-y-2">
                    <div className="h-5 bg-gray-100 rounded-xl w-20 animate-pulse" />
                    <div className="h-3 bg-gray-50 rounded-lg w-16 animate-pulse" />
                </div>
            </div>
            <div className="p-6">
                <div className="h-12 bg-gray-50 rounded-2xl mb-6 animate-pulse" />
                <div className="space-y-3">
                    {[0,1,2,3,4].map(i => (
                        <div key={i} className="flex gap-4 p-4 rounded-3xl" style={{ animationDelay: `${i * 0.08}s` }}>
                            <div className="w-14 h-14 bg-gray-100 rounded-2xl animate-pulse shrink-0" />
                            <div className="flex-1 space-y-2 py-1">
                                <div className="h-4 bg-gray-100 rounded-xl w-1/3 animate-pulse" />
                                <div className="h-3 bg-gray-50 rounded-xl w-2/3 animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
