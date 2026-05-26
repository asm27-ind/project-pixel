const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    googleId: { type: String, required: true, unique: true, index: true },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please use a valid email structure']
    },
    displayName: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('User', UserSchema);