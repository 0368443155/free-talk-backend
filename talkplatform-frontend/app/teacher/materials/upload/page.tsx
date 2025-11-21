import { UploadMaterialForm } from '@/components/marketplace/upload-form';

export default function UploadMaterialPage() {
    return (
        <div className="container mx-auto py-8 px-4 max-w-3xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Upload Material</h1>
                <p className="text-gray-500 mt-1">Share your knowledge and earn credits</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                <UploadMaterialForm />
            </div>
        </div>
    );
}
