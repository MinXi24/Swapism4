# Background Removal API - Subject Selection Guide

## 🤔 How Background Removal Works

### Current Implementation: Remove.bg API

The app currently uses **remove.bg API** which automatically detects and removes backgrounds from images. Here's how it handles different scenarios:

---

## 📸 Subject Detection

### Single Person/Object
✅ **Works automatically**
- The API automatically detects the main subject
- Background is removed cleanly
- No manual selection needed

### Multiple People in Photo
⚠️ **Automatic Foreground Detection**
- Remove.bg detects **all foreground subjects** automatically
- It keeps ALL people/objects in the foreground
- Cannot select specific person - it removes only the background

**Example:**
- Photo with 2 people → Both people are kept, background removed
- Photo with person + object → Both kept, background removed

---

## 🎯 Solution Options

### Option 1: Pre-crop Before Upload (RECOMMENDED)
**Best approach for precise control**

1. When taking/selecting photo in AddPostScreen
2. Use the built-in crop feature (already enabled with `allowsEditing: true`)
3. Crop to show only the person/item you want
4. Background removal then works on just that subject

**Implementation:**
```javascript
const result = await ImagePicker.launchCameraAsync({
  allowsEditing: true,  // ✅ Already enabled - allows cropping
  aspect: [4, 3],
  quality: 1,
});
```

### Option 2: Manual Subject Selection API
**More complex but precise**

Some APIs offer subject selection:
- **Pixian.ai** - Has foreground selection options
- **Adobe Firefly API** - Advanced subject detection
- **Custom ML Model** - Using TensorFlow Lite

**Limitations:**
- Higher complexity
- May require paid plans
- Additional API setup

### Option 3: AI-Powered Smart Selection
**Future enhancement**

Use person detection to identify and select:
```javascript
// Detect faces in image
const faces = await detectFaces(imageUri);

// If multiple faces, show picker
if (faces.length > 1) {
  const selected = await showFaceSelector(faces);
  // Crop to selected person
  const cropped = await cropToFace(imageUri, selected);
  // Remove background
  await removeBackground(cropped);
}
```

---

## 🔧 Current App Behavior

### AddPostScreen
1. User takes photo or selects from gallery
2. **Crop editor appears automatically** (allowsEditing: true)
3. User crops to desired subject
4. Background removal happens on cropped image
5. Clean image with single subject

### Remove.bg API Behavior
- Detects foreground automatically
- Removes background (walls, sky, furniture, etc.)
- Keeps all foreground subjects (people, objects)
- Works best with single, clear subject

---

## 💡 Best Practices

### For Clothing Photos
✅ **DO:**
- Take photos with person wearing the item alone
- Use plain background if possible
- Center the person in frame
- Good lighting helps detection

❌ **DON'T:**
- Have multiple people in photo
- Include distracting objects
- Use cluttered backgrounds
- Take photos too far away

### For Try-On Feature
1. **When posting clothes:**
   - Take individual photos of each item
   - One person per photo
   - Use the crop tool to isolate subject

2. **When photos have multiple people:**
   - Crop to just the person wearing the item
   - Background removal will work on that person

---

## 🆕 Enhanced Features (Available)

### Option A: Add Subject Selector
If you need to handle photos with multiple people:

```javascript
// 1. Detect people using face detection
import * as FaceDetector from 'expo-face-detector';

// 2. Show overlay with selection boxes
const detectPeople = async (imageUri) => {
  const detection = await FaceDetector.detectFacesAsync(imageUri);
  return detection.faces;
};

// 3. Let user tap to select person
// 4. Crop to selected area
// 5. Remove background
```

### Option B: Alternative APIs

**Pixian.ai** (Free tier: 10 images/month)
- Better subject detection
- Can specify foreground selection
- No API key needed for basic use

**Update in config.js:**
```javascript
export const config = {
  BG_REMOVAL_SERVICE: 'pixian', // 'removebg' or 'pixian'
  REMOVE_BG_API_KEY: 'your-key-here',
};
```

---

## 📊 API Comparison

| Feature | Remove.bg | Pixian.ai | Custom ML |
|---------|-----------|-----------|-----------|
| Auto Detection | ✅ | ✅ | ⚠️ Complex |
| Subject Selection | ❌ | ⚠️ Limited | ✅ Full Control |
| Free Tier | 50/month | 10/month | Unlimited |
| Quality | Excellent | Good | Varies |
| Setup | Easy | Easy | Hard |

---

## 🎬 User Flow

### Current Implementation:
```
1. User taps "Upload Photo"
2. Choose: "Take Photo" or "Gallery"
3. Image opens in editor
4. User crops to desired subject ← KEY STEP
5. Confirm crop
6. Background auto-removed
7. Clean image ready for try-on
```

### What Happens with 2 People:
```
Scenario: Photo has 2 people

Without Crop:
- Both people kept
- Background removed
- Both show in try-on ❌

With Crop:
- User crops to one person
- Background removed from cropped area
- Only selected person in try-on ✅
```

---

## 🚀 Quick Start Guide

### For Users:
1. **Take clear photos** - one person per photo
2. **Use the crop tool** - isolate the subject you want
3. **Let background removal do its magic** - automatic and clean

### For Developers:
1. Current implementation handles most cases with crop
2. If subject selection needed, see Option A above
3. For better detection, consider switching to Pixian.ai

---

## 🔮 Future Enhancements

Potential features to add:

1. **Smart Crop Suggestions**
   - Auto-detect and suggest crop areas
   - Highlight detected people

2. **Face Recognition**
   - Remember user's face
   - Auto-select user in group photos

3. **Object Segmentation**
   - Detect clothing items specifically
   - Separate top from bottom automatically

4. **Preview Mode**
   - Show before/after background removal
   - Option to keep or retry

---

## ❓ FAQ

**Q: Can I select just one person from a group photo?**
A: Yes! Use the crop editor when selecting the photo to frame just that person.

**Q: What if background removal fails?**
A: The app falls back to showing the original image. Check your API key and internet connection.

**Q: How many photos can I process?**
A: Free tier: 50 per month with remove.bg. Plan accordingly.

**Q: Can I process photos offline?**
A: No, background removal requires internet connection to API.

**Q: What image formats are supported?**
A: JPG, PNG, WebP - standard formats from camera or gallery.

---

## 📞 Support

For issues with background removal:
1. Verify API key in `config.js`
2. Check API usage at remove.bg dashboard
3. Try cropping image before upload
4. Contact support if persistent issues

---

**Remember:** The crop tool is your friend! Use it to ensure clean, single-subject photos for best try-on results. 👔👗
