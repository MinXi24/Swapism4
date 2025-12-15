# Swap Request Feature - Removal Guide

## ✨ New Organized Structure

The swap feature has been refactored following React best practices:

### Feature Files

1. **`hooks/useSwapRequest.js`** - Custom hook containing all swap logic
2. **`components/SwapRequestCard.js`** - Reusable swap card UI component  
3. **`components/ItemPickerModal.js`** - Reusable item picker modal component
4. **`screens/messages/ChatScreen.js`** - Uses the swap feature
5. **`screens/profile/PostDetailsScreen.js`** - Initiates swap requests

### Benefits of This Structure
- ✅ Proper separation of concerns (logic vs UI)
- ✅ Reusable components can be used elsewhere
- ✅ Easier to test and maintain
- ✅ Follows React/React Native conventions
- ✅ Clean imports from dedicated folders

---

## 🗑️ How to Remove Swap Feature Completely

### Step 1: Delete Feature Files

Delete these 3 files:
```
hooks/useSwapRequest.js
components/SwapRequestCard.js
components/ItemPickerModal.js
```

### Step 2: Update ChatScreen.js

**Remove these imports** (around line 1-30):
```javascript
// DELETE THESE LINES
import { ItemPickerModal } from '../../components/ItemPickerModal';
import { SwapRequestCard } from '../../components/SwapRequestCard';
import { useSwapRequest } from '../../hooks/useSwapRequest';
```

**Remove swapRequest from params** (around line 34-35):
```javascript
// BEFORE:
const { user, swapRequest } = route.params;

// AFTER:
const { user } = route.params;
```

**Remove hook usage** (around line 48-60):
```javascript
// DELETE THIS ENTIRE BLOCK:
const {
  userItems,
  showItemPicker,
  setShowItemPicker,
  handleSelectMyItem,
  handleAcceptSwap,
  handleRejectSwap,
} = useSwapRequest({
  currentUser,
  otherUserId,
  otherUserName,
  swapRequest,
  db,
  messages,
});
```

**Remove swap card rendering** in `renderMessage` function:
```javascript
// DELETE THIS BLOCK (around line 100-115):
if (item.type === 'swap_request' && item.swapDetails) {
  return (
    <SwapRequestCard
      message={item}
      isMyMessage={isMyMessage}
      currentUserId={currentUser?.uid}
      onAccept={handleAcceptSwap}
      onReject={handleRejectSwap}
      formatTime={formatTime}
    />
  );
}
```

**Remove modal component** (at the end of JSX, before closing KeyboardAvoidingView):
```javascript
// DELETE THIS:
<ItemPickerModal
  visible={showItemPicker}
  onClose={() => setShowItemPicker(false)}
  items={userItems}
  onSelectItem={handleSelectMyItem}
/>
```

### Step 3: Update PostDetailsScreen.js

**Remove handleSwapNow function** (around line 440-468):
```javascript
// DELETE THE ENTIRE handleSwapNow FUNCTION
const handleSwapNow = async () => {
  // ... entire function
};
```

**Remove Swap Now button** from JSX (search for "Swap Now"):
```javascript
// DELETE THIS BUTTON:
<TouchableOpacity style={styles.swapButton} onPress={handleSwapNow}>
  <Icon name="swap-horizontal" size={20} color="#fff" />
  <Text style={styles.swapButtonText}>Swap Now</Text>
</TouchableOpacity>
```

**Remove swap button styles** (search for `swapButton:`):
```javascript
// DELETE THESE STYLES:
swapButton: { ... },
swapButtonText: { ... },
```

### Step 4: Update MessagesScreen.js (Optional)

If MessagesScreen shows "🔄 Swap Request" preview:

Find where it displays swap_request message type:
```javascript
// FIND AND REMOVE:
{messageData.type === 'swap_request' && '🔄 Swap Request'}
```

Replace with:
```javascript
{messageData.text || 'Message'}
```

### Step 5: Clean Up Firebase (Optional)

If you want to remove existing swap request data:

```javascript
// Run this once to clean up:
const messagesRef = collection(db, 'messages');
const swapMessagesQuery = query(messagesRef, where('type', '==', 'swap_request'));
const snapshot = await getDocs(swapMessagesQuery);
snapshot.forEach(doc => deleteDoc(doc.ref));
```

---

## 📝 What Changed During Refactoring

### Before (Not Following Best Practices)
```
screens/messages/
  ├── ChatScreen.js (all logic inline)
  ├── SwapRequestHandler.js (in screens folder)
  └── SwapRequestUI.js (in screens folder)
```

### After (Following Best Practices) ✨
```
hooks/
  └── useSwapRequest.js

components/
  ├── SwapRequestCard.js
  └── ItemPickerModal.js

screens/messages/
  └── ChatScreen.js (clean, just imports)
```

---

## 🚀 Feature Overview

### What It Does
- Users can initiate swap requests from item detail screens
- Select one of their available items to offer in exchange
- Receiver sees swap request in chat with accept/reject buttons
- Both items marked as "swapped out" when accepted
- Real-time status updates in messages

### Collections Used
- `messages` - Stores swap request messages
- `conversations` - Updates conversation preview
- `wardrobe-plug-fyp/user/images` - Queries available items, updates swap status

---

## 🔧 Migration Notes

If you made custom changes to the old files (`SwapRequestHandler.js`, `SwapRequestUI.js`), you'll need to:

1. Migrate custom logic → `hooks/useSwapRequest.js`
2. Migrate UI changes → `components/SwapRequestCard.js` or `components/ItemPickerModal.js`
3. Update import paths in any custom screens

The new structure makes it easier to extend, test, and maintain!
