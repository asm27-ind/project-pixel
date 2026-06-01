import API from './api';

export const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    // 🔥 THE ABSOLUTE FIX: You must pass the header config block here!
    const res = await API.post('/images/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return res.data;
};

export const applyTransform = async (projectId, algorithm) => {
    const res = await API.post('/images/transform', { projectId, algorithm });
    return res.data;
};
