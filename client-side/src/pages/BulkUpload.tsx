import { useState } from 'react';
import { BulkVocabularyUpload } from '@/components/BulkVocabularyUpload';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BulkUpload() {
    const navigate = useNavigate();
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const handleSuccess = () => {
        setUploadSuccess(true);
        setTimeout(() => {
            navigate('/vocabulary');
        }, 2000);
    };

    const handleCancel = () => {
        navigate('/vocabulary');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">Bulk Upload</h1>
                <p className="text-muted-foreground">Import multiple vocabulary items at once using CSV or JSON files</p>
            </div>

            {/* Success Message */}
            {uploadSuccess && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                        Upload successful! Redirecting to vocabulary page...
                    </AlertDescription>
                </Alert>
            )}

            {/* Bulk Upload Component */}
            <Card>
                <CardContent className="p-6">
                    <BulkVocabularyUpload
                        onSuccess={handleSuccess}
                        onCancel={handleCancel}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
