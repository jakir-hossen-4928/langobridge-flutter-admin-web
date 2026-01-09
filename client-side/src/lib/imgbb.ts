export const uploadImageToImgbb = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

    if (!API_KEY) {
        throw new Error('ImgBB API Key is missing');
    }

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (data.success) {
            return data.data.url;
        } else {
            throw new Error(data.error?.message || 'Upload failed');
        }
    } catch (error) {
        console.error('Error uploading to ImgBB:', error);
        throw error;
    }
};
