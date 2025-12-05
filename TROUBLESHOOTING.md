# Swapism Image Upload Troubleshooting Guide

## ✅ FIXED: Firestore Index Error
The composite index error has been resolved by removing `orderBy()` from queries with `where()` clauses.

## 🔍 Image Not Displaying - Debugging Steps

### 1. Check Cloudinary Configuration

**A. Verify Upload Preset (CRITICAL)**
1. Go to: https://console.cloudinary.com/
2. Click **Settings** → **Upload**
3. Scroll to **Upload presets**
4. Find or create preset `myPreset`
5. **IMPORTANT:** Set Mode to **"Unsigned"**
   ```
   Mode: Unsigned
   Signing Mode: Unsigned
   ```
6. Save changes

**B. Verify Cloud Name**
- Current: `dblq6cttn`
- Found on dashboard homepage
- Update in `AddPostScreen.js` line 20 if different

### 2. Check Console Logs

After posting an image, look for these logs:
```
✓ Starting upload process...
✓ Uploading to Cloudinary...
✓ Cloudinary upload successful: https://...
✓ Image uploaded, URL: https://...
✓ Saving to Firestore...
✓ Post saved successfully!
```

**If you see errors:**
- ❌ "Failed to upload to Cloudinary" → Check upload preset is Unsigned
- ❌ "Invalid signature" → Upload preset must be Unsigned
- ❌ "Upload preset not found" → Create preset named `myPreset`

### 3. Check Firebase Firestore

**A. Verify Collection Exists:**
1. Go to: https://console.firebase.google.com/
2. Select project: `wardrobe-plug-fyp`
3. Go to **Firestore Database**
4. Check if `userImages` collection exists
5. Click on a document and verify it has:
   - `url` (string with https://res.cloudinary.com/...)
   - `ownerUid` (string)
   - `userName` (string)
   - `title` (string)
   - `uploadedAt` (timestamp)

**B. Check Image URL Format:**
Should look like:
```
https://res.cloudinary.com/dblq6cttn/image/upload/v1234567890/abc123.jpg
```

### 4. Common Issues & Solutions

| Problem | Cause | Solution |
|---------|-------|----------|
| Images don't appear after posting | Upload preset is "Signed" | Change to "Unsigned" in Cloudinary |
| "Invalid signature" error | Upload preset requires authentication | Use Unsigned preset |
| Posts saved but no image | Cloudinary upload failed | Check console logs, verify cloud name |
| Can't see posts in profile | Wrong user ID filter | Check auth.currentUser.uid |

### 5. Test Cloudinary Directly

Run this test in your AddPostScreen after selecting an image:

```javascript
// Add this temporarily in handlePost to test
console.log('Testing Cloudinary...');
console.log('Cloud Name:', CLOUDINARY_CLOUD_NAME);
console.log('Preset:', CLOUDINARY_UPLOAD_PRESET);
console.log('Image URI:', selectedImage.uri);
```

### 6. Network Issues

If using Android emulator:
- Emulator needs internet connection
- Check your computer's firewall
- Try on physical device

If using iOS simulator:
- Should work automatically
- Check Mac's internet connection

### 7. Image Display Issues

If posts save but images don't render:

**A. Check Image Component:**
- Profile posts use: `<Image source={{ uri: post.url }} />`
- URL must be HTTPS
- Cloudinary URLs should work directly

**B. Test Image URL:**
Copy a URL from Firestore and paste in browser
- Should display the image
- If 404 → Upload failed
- If displays → React Native Image issue

### 8. Quick Fixes

**Reset and Try Again:**
```bash
# Clear cache
expo start -c

# Or restart Metro bundler
Ctrl+C
expo start
```

**Check Permissions:**
```javascript
// Already implemented in code
await ImagePicker.requestMediaLibraryPermissionsAsync();
```

## 📱 Testing Checklist

- [ ] Cloudinary upload preset is "Unsigned"
- [ ] Cloud name matches dashboard (dblq6cttn)
- [ ] Can select image from gallery
- [ ] Console shows "Cloudinary upload successful"
- [ ] Console shows URL starting with https://res.cloudinary.com/
- [ ] Firestore document created with correct URL
- [ ] Image URL opens in browser
- [ ] loadUserPosts() called after upload
- [ ] ProfileScreen shows new post

## 🎯 Next Steps

1. Try posting an image
2. Check Metro console for logs
3. Verify Firestore has the document
4. Copy URL from Firestore and open in browser
5. Report which step fails

## 📞 Still Having Issues?

Share these details:
1. Console logs from upload attempt
2. Screenshot of Cloudinary upload preset settings
3. Screenshot of Firestore document
4. Whether image URL opens in browser
