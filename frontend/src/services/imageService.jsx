import API from './api';

export const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const res = await API.post('/images/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
};

export const applyTransform = async (projectId, algorithm) => {
    const res = await API.post('/process/transform', { projectId, algorithm });
    return res.data;
};