# 📚 Your Code Study Guide - Swapism4 App

This guide will help you review and understand all the features YOU implemented. Each section is organized by area with specific functions to focus on.

---

## 🏠 **SECTION 1: HOME PAGE FEATURES**

### **Files to Review:**
1. [screens/home/HomeScreen.js](screens/home/HomeScreen.js)
2. [screens/home/PostActivityScreen.js](screens/home/PostActivityScreen.js)
3. [screens/home/SearchScreen.js](screens/home/SearchScreen.js)

### **Study Order & Key Functions:**

#### **Step 1: Start with HomeScreen.js** (Lines 1-1110)
Focus on these functions YOU implemented:

1. **Like Functionality** (Lines ~350-420)
   - `handleLike()` - Adds/removes likes on posts
   - `checkIfPostIsLiked()` - Checks if current user liked a post
   - Like count display under each post

2. **Comment on Posts** (Lines ~450-550)
   - Navigation to `PostActivityScreen` for commenting
   - Comment icon and display

3. **Search Bar & Function** (Lines ~200-250)
   - Search icon in header
   - Navigation to `SearchScreen`

4. **Suggested Accounts** (Lines ~600-750)
   - `loadSuggestedUsers()` - Loads user suggestions
   - Display logic for suggested accounts section
   - Follow/Unfollow functionality in suggestions

5. **Like Count Display** (Lines ~800-900)
   - Shows number of likes on each post
   - `{post.likes?.length || 0} likes` display

6. **Date Under Posts** (Lines ~900-950)
   - Date formatting and display
   - Uses `createdAt` timestamp

7. **Home Page Illustration** (Lines ~100-200)
   - Welcome banner or illustration display
   - Decorative elements

**What to Look For:**
- How posts are fetched from Firestore
- How the FlatList renders posts
- Integration with Firebase for real-time updates

---

#### **Step 2: PostActivityScreen.js** (Lines 1-550)
**This is your notification screen for follows!**

Focus on:

1. **Follow Request Notifications** (Lines ~55-85)
   - Queries `followRequests` collection
   - Filters by `toUserId == current user`
   - Shows pending follow requests

2. **Following Notifications** (Lines ~85-120)
   - When someone accepts your follow request
   - Notification type: `follow_request`

3. **Activity Display** (Lines ~200-300)
   - Renders follow requests
   - Accept/Reject buttons
   - User profile photos and names

**Skip:** Lines about likes/comments notifications (NOT done by you)

**What to Look For:**
- How `followRequests` collection is queried
- Accept/Reject follow request logic
- Real-time updates with `loadActivities()`

---

#### **Step 3: SearchScreen.js** (Lines 1-430)
**Your search implementation!**

Focus on:

1. **Search Bar UI** (Lines ~150-200)
   - TextInput with search icon
   - Real-time search as you type

2. **Search Function** (Lines ~28-130)
   - `handleSearch()` - Main search logic
   - Searches users by username
   - Searches posts by title/description
   - Filters blocked users

3. **Tab System** (Lines ~180-250)
   - Three tabs: Accounts, For Fun, For Swap
   - Different search results per tab

4. **Search Results Display** (Lines ~250-400)
   - User results with profile photos
   - Post results with images
   - Mutual followers display

**What to Look For:**
- Text matching algorithm (case-insensitive)
- Firestore queries for users and posts
- Filtering logic (blocked users, deleted accounts)

---

## 👤 **SECTION 2: PROFILE & POSTING FEATURES**

### **Files to Review:**
1. [screens/profile/ProfileScreen.js](screens/profile/ProfileScreen.js)
2. [screens/profile/AddPostScreen.js](screens/profile/AddPostScreen.js)
3. [screens/profile/PostDetailsScreen.js](screens/profile/PostDetailsScreen.js)
4. [screens/profile/TryOnScreen.js](screens/profile/TryOnScreen.js)

### **Study Order & Key Functions:**

#### **Step 4: ProfileScreen.js** (Lines 1-1410)
**The ENTIRE profile page is yours!**

Focus on:

1. **Profile Layout** (Lines ~800-1000)
   - Profile photo display
   - Username, bio, location
   - Stats (followers, following, swaps)
   - Edit profile button

2. **Posts Grid Display** (Lines ~1100-1300)
   - Tab system (For Fun / For Swap / Discover)
   - Grid layout with images
   - Post count display

3. **Rating System** (Lines ~400-600)
   - `loadUserProfile()` - Loads user rating
   - Average rating calculation
   - Review count display
   - Star rating UI

4. **Reviews Section** (Lines ~600-800)
   - `fetchReviewsWithUserData()` - Gets reviewer info
   - Displays all reviews with user photos
   - Rating stars for each review

5. **Location Display** (Lines ~300-400)
   - Shows user's location/area
   - Postal code display
   - Location modal

6. **Settings Navigation** (Lines ~200-250)
   - Settings icon in header
   - Navigation to settings screens

**What to Look For:**
- How user data is loaded from Firestore
- Profile statistics calculation
- Tab switching logic
- Review data structure

---

#### **Step 5: AddPostScreen.js** (Lines 1-894)
**All posting functionality!**

Focus on:

1. **Image Upload** (Lines ~70-180)
   - `pickImage()` - Gallery picker
   - `takePhoto()` - Camera functionality
   - Multiple image support (up to 2)
   - Image preview

2. **Post Form** (Lines ~200-400)
   - Title input
   - Description input
   - Post type selector (For Fun / For Swap / Both)
   - Clothing type selector

3. **For Swap Specific Fields** (Lines ~400-550)
   - Size selector (XS, S, M, L, XL)
   - Condition dropdown
   - Additional details input

4. **Upload to Cloudinary** (Lines ~600-700)
   - `uploadImageToCloudinary()` function
   - Image compression
   - URL generation

5. **Save to Firestore** (Lines ~700-850)
   - `handlePost()` - Main posting function
   - Creates document in `wardrobe-plug-fyp/user/images`
   - Saves all post metadata
   - Success/error handling

**What to Look For:**
- Form validation
- Image permissions handling
- Cloudinary integration
- Firestore data structure for posts
- Try-on integration (captured image from TryOnScreen)

---

#### **Step 6: PostDetailsScreen.js** (Lines 1-1271)
**Post interactions and comments!**

Focus on:

1. **Comment Functionality** (Lines ~200-350)
   - `handleAddComment()` - Adds new comment
   - `loadComments()` - Fetches all comments
   - Comment display with user info
   - Edit/delete comment options

2. **Like Post Function** (Lines ~400-500)
   - `handleLike()` - Like/unlike post
   - `checkIfLiked()` - Check if user liked
   - Like count display

3. **Post Details Display** (Lines ~600-800)
   - Full post image
   - Title and description
   - Owner username and photo
   - Date posted
   - Like count
   - Comment count

4. **Comments Section** (Lines ~800-1000)
   - Scrollable comments list
   - User profile photos in comments
   - Timestamp for each comment
   - New comment input box

**What to Look For:**
- Comments collection structure
- Real-time comment updates
- User data fetching for each comment
- Like tracking in separate collection

---

#### **Step 7: TryOnScreen.js** (Lines 1-1615)
**Virtual try-on & favorites!**

Focus on:

1. **Virtual Try-On Feature** (Lines ~200-400)
   - Camera integration
   - Clothing overlay on camera feed
   - Swipe between tops/bottoms
   - Pinch to zoom and drag to position

2. **Background Removal** (Lines ~100-200)
   - `removeBackground()` - ClipDrop API integration
   - Processes clothing images
   - Removes background for overlay

3. **Capture & Save** (Lines ~500-650)
   - `capturePhoto()` - Takes screenshot of try-on
   - Saves to device gallery
   - Shows preview

4. **Add to Favorites** (Lines ~700-850)
   - `addToFavourites()` function
   - Saves try-on combo to Firestore
   - Stores in user's favorites collection
   - Success notification

5. **Clothing Selection** (Lines ~900-1100)
   - Separates tops and bottoms
   - Swipeable carousel
   - Suggested items based on style

**What to Look For:**
- Camera permissions
- Gesture handlers (pinch, drag)
- Animated values for transforms
- Favorites collection structure
- Integration with other screens

---

## 💬 **SECTION 3: MESSAGING FEATURES**

### **Files to Review:**
1. [screens/messages/ChatScreen.js](screens/messages/ChatScreen.js)

### **Study Order & Key Functions:**

#### **Step 8: ChatScreen.js** (Lines 1-1767)
**Calendar and location features!**

Focus on:

1. **Send Meetup Date/Time** (Lines ~400-600)
   - `handleSendMeetup()` - Creates calendar event
   - Date picker modal
   - Time picker modal
   - Sends message with meetup details

2. **Add to Calendar** (Lines ~600-750)
   - Calendar permissions
   - `Calendar.createEventAsync()` - Adds event to device calendar
   - Event details (title, date, time, notes)

3. **Send Location** (Lines ~800-950)
   - `handleSendLocation()` - Sends postal code
   - Location modal with input
   - Sends message with location data

4. **Open in Google Maps** (Lines ~950-1100)
   - `handleOpenLocation()` - Opens map
   - Constructs Google Maps URL
   - Uses `Linking.openURL()`
   - Shows location on map

5. **Message Display** (Lines ~1200-1500)
   - Different message types (text, location, meetup, swap request)
   - Special rendering for location messages
   - Special rendering for meetup messages
   - Tap location to open in maps

**What to Look For:**
- Calendar permissions handling
- Date/time picker integration
- Message types in Firestore
- Location data structure
- Linking to external apps (Google Maps)

---

## ⚙️ **SECTION 4: SETTINGS FEATURES**

### **Files to Review:**
1. [screens/settings/PrivacyScreen.js](screens/settings/PrivacyScreen.js)
2. [screens/settings/SettingsScreen.js](screens/settings/SettingsScreen.js)

### **Study Order & Key Functions:**

#### **Step 9: PrivacyScreen.js** (Lines 1-240)
**Privacy settings implementation!**

Focus on:

1. **Private Account Toggle** (Lines ~50-75)
   - `handlePrivacyToggle()` - Updates privacy setting
   - Switch UI component
   - Updates Firestore `isPrivate` field

2. **Load Privacy Settings** (Lines ~28-45)
   - `loadPrivacySettings()` - Fetches current setting
   - Reads from user document

3. **Privacy Explanation** (Lines ~100-150)
   - Info sections explaining features
   - "What happens when your account is private"
   - Public vs Private account differences

**What to Look For:**
- Switch component state management
- Firestore update logic
- User feedback (alerts)

---

#### **Step 10: SettingsScreen.js** (Lines 1-322)
**Logout functionality!**

Focus on:

1. **Logout Function** (Lines ~67-95)
   - `handleLogout()` - Signs out user
   - Confirmation alert
   - `auth.signOut()`
   - Navigation to Welcome screen

2. **Settings Menu Layout** (Lines ~100-250)
   - List of settings options
   - Navigation to sub-screens
   - Icons and labels

**What to Look For:**
- Firebase Auth signOut method
- Navigation reset after logout
- Alert confirmation pattern

---

## 📝 **SUGGESTED STUDY PLAN**

### **Week 1: Home Features**
- **Day 1-2:** HomeScreen.js - Posts display, likes, dates
- **Day 3:** PostActivityScreen.js - Notifications
- **Day 4-5:** SearchScreen.js - Search functionality

### **Week 2: Profile & Posts**
- **Day 1-2:** ProfileScreen.js - Profile layout, ratings
- **Day 3-4:** AddPostScreen.js - Posting functionality
- **Day 5:** PostDetailsScreen.js - Comments and likes

### **Week 3: Advanced Features**
- **Day 1-3:** TryOnScreen.js - Virtual try-on
- **Day 4-5:** ChatScreen.js - Calendar and maps

### **Week 4: Settings**
- **Day 1:** PrivacyScreen.js - Privacy features
- **Day 2:** SettingsScreen.js - Logout
- **Day 3-5:** Review and test everything

---

## 🔑 **KEY CONCEPTS TO UNDERSTAND**

### **1. Firebase Firestore**
- Collections: `users`, `wardrobe-plug-fyp/user/images`, `comments`, `likes`, `followRequests`, `messages`
- Queries: `where()`, `query()`, `getDocs()`
- Real-time updates with listeners

### **2. React Native Components**
- FlatList for scrolling lists
- Modal for popups
- TextInput for forms
- TouchableOpacity for buttons
- Image for displaying photos

### **3. State Management**
- `useState` for local state
- `useEffect` for side effects
- `useFocusEffect` for screen focus
- Async/await for Firestore operations

### **4. Navigation**
- `navigation.navigate()` - Go to screen
- `route.params` - Receive data
- `navigation.goBack()` - Return to previous screen

### **5. External APIs**
- Cloudinary for image uploads
- ClipDrop for background removal
- Google Maps for location
- Calendar for events

---

## 💡 **TIPS FOR REVIEWING**

1. **Read Comments First** - Many functions have helpful comments explaining logic
2. **Follow Data Flow** - Track how data moves from Firestore → Screen → User
3. **Test Each Feature** - Run the app and test your features while reading code
4. **Take Notes** - Write down questions or unclear parts
5. **Draw Diagrams** - Sketch out data flow and screen navigation
6. **Check Firebase Console** - Look at actual data structure
7. **Console Logs** - Add `console.log()` to see values during testing

---

## 🎯 **WHAT YOU DID NOT DO (Skip These)**

In **PostActivityScreen.js**:
- ❌ Notifications for likes on posts (someone else did this)
- ❌ Notifications for comments on posts (someone else did this)

**Focus only on:**
- ✅ Follow request notifications
- ✅ Following notifications (when someone accepts your follow)

---

## 🚀 **QUICK START GUIDE**

**If you only have 1 hour to review:**

1. **HomeScreen.js** - Lines 350-420 (likes) and 800-950 (display)
2. **SearchScreen.js** - Lines 28-130 (search function)
3. **ProfileScreen.js** - Lines 400-600 (ratings) and 800-1000 (layout)
4. **AddPostScreen.js** - Lines 700-850 (posting function)
5. **ChatScreen.js** - Lines 600-750 (calendar) and 950-1100 (maps)

**If you have a full day:**
Follow the Week 1-4 plan above, spending 1-2 hours per file.

---

## 📞 **KEY FIRESTORE COLLECTIONS YOU USE**

| Collection | What It Stores | Your Features |
|------------|----------------|---------------|
| `users` | User profiles | Profile data, ratings, location |
| `wardrobe-plug-fyp/user/images` | Posts | All posting functions |
| `comments` | Post comments | Commenting feature |
| `likes` | Post likes | Like functionality |
| `followRequests` | Follow requests | Follow notifications |
| `messages` | Chat messages | Location & calendar messages |
| `favourites` | Try-on combos | Add to favorites feature |

---

Good luck with your revision! Start with Section 1 (Home Features) and work your way down. Each section builds on concepts from previous sections. 🎓✨
