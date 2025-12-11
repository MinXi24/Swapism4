# Virtual Try-On Feature - Setup Guide

## 🎉 New Features Implemented

### 1. **Mirror Tab - Your Clothes Only**
The Mirror tab in your profile now shows **only your own posted clothes**, not items from other users.

### 2. **AI Background Removal**
Automatically removes backgrounds from clothing images for a clean virtual try-on experience using remove.bg API.

### 3. **Smart Navigation**
- Navigate through your tops and bottoms using **left/right arrow buttons**
- No need to click into items - everything displays directly on the mirror screen
- Counter shows current item position (e.g., "1 / 5")

### 4. **Live Camera Try-On**
- Turn on camera to see yourself wearing the selected outfit
- Selected top and bottom clothes overlay on your camera view
- Navigate between different clothes while camera is active using arrow buttons
- Position yourself to see both top and bottom together

---

## 🔧 Setup Instructions

### Step 1: Get Your Remove.bg API Key

1. Go to [https://remove.bg/api](https://remove.bg/api)
2. Sign up for a free account
3. Get your API key (Free tier: 50 API calls/month)
4. Copy the API key

### Step 2: Configure API Key

1. Open the file: `c:\C300\Swapism4\config.js`
2. Replace `'YOUR_API_KEY_HERE'` with your actual API key:

```javascript
export const config = {
  REMOVE_BG_API_KEY: 'your-actual-api-key-here',
};
```

### Step 3: Alternative - Use Pixian.ai (Optional)

If you prefer Pixian.ai instead of remove.bg:

1. Update the `removeBackground` function in `TryOnScreen.js`
2. Replace the remove.bg API endpoint with Pixian.ai endpoint
3. Pixian.ai doesn't require an API key for basic usage

---

## 📱 How to Use

### Using the Virtual Try-On:

1. **Go to Profile → Mirror Tab**
   - Only your posted clothes will appear here
   - Each item shows a "Try On" badge

2. **Click on any clothing item**
   - Opens the Virtual Try-On screen
   - Items are automatically categorized into TOPS and BOTTOMS

3. **Navigate Through Clothes**
   - Use **left/right arrows** to browse tops
   - Use **left/right arrows** to browse bottoms
   - Background removal happens automatically (may take 1-2 seconds)

4. **Turn On Camera**
   - Click the camera button at the top
   - Grant camera permission when prompted
   - Your selected outfit overlays on the camera view

5. **Try Different Outfits on Camera**
   - Use the arrow buttons while camera is active
   - Position yourself to view both top and bottom
   - Stand at an angle where both pieces are visible

6. **Save Favorites**
   - Click "Save This Outfit" to save your favorite combinations

---

## 🎨 Clothing Type Categories

To ensure proper categorization, when adding posts:

1. **For Tops**: Select "Top" in the Clothing Type selector
   - Includes: Shirts, T-shirts, Blouses, Jackets, Sweaters
   
2. **For Bottoms**: Select "Bottom" in the Clothing Type selector
   - Includes: Pants, Jeans, Shorts, Skirts

3. **For Other Items**: Select "Other"
   - These won't appear in the virtual try-on

---

## 🔍 Troubleshooting

### Background Removal Not Working
- **Check API key**: Make sure you've added your remove.bg API key in `config.js`
- **API limit**: Free tier has 50 calls/month. Check your usage at remove.bg dashboard
- **Fallback**: If background removal fails, the original image is shown

### Camera Not Showing
- **Permissions**: Make sure you granted camera permission
- **iOS**: Check that `NSCameraUsageDescription` is set in Info.plist
- **Android**: Check camera permissions in AndroidManifest.xml

### Items Not Categorized Correctly
- **Manual fix**: Edit the post and select correct clothing type
- **Automatic detection**: The app also tries to detect from title/description using keywords

### No Items in Mirror Tab
- **Check post type**: Only "For Swap" and "For Fun" posts appear
- **Add clothing type**: Make sure posts have `clothingType` field set

---

## 💡 Tips for Best Results

1. **Take Clear Photos**: 
   - Use plain background for clothing photos
   - Good lighting helps background removal work better

2. **Camera Positioning**:
   - Stand about 5-6 feet from camera
   - Frame yourself from head to knees to see full outfit

3. **Categorize Correctly**:
   - Always select correct clothing type when posting
   - This ensures items appear in correct sections

4. **Save API Calls**:
   - Background removal is cached
   - Same image won't be processed twice
   - Free tier gives 50 calls/month

---

## 🚀 Advanced Features (Coming Soon)

- Mix and match with other users' clothes
- AR-based fitting with body measurements
- Outfit sharing and recommendations
- Save outfit combinations
- Virtual closet organization

---

## 📝 Technical Details

### Files Modified:
- `screens/profile/ProfileScreen.js` - Mirror tab now shows only user's posts
- `screens/profile/TryOnScreen.js` - Complete rewrite with new features
- `config.js` - New configuration file for API keys

### Dependencies:
- `expo-camera` - Camera integration
- `remove.bg API` - Background removal service

### API Usage:
- Background removal happens automatically
- Results are cached to save API calls
- Fallback to original image if removal fails

---

## ❓ Support

If you encounter any issues:
1. Check the console for error messages
2. Verify API key is correct in `config.js`
3. Make sure all dependencies are installed: `npm install`
4. Restart the development server

---

**Enjoy your new Virtual Try-On feature! 👗👔**
