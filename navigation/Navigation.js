import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import ManageAccountScreen from '../screens/admin/manageAccountScreen';
import ManageCommentsScreen from '../screens/admin/manageCommentsScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import FavouritesScreen from '../screens/favourites/FavouritesScreen';
import HomeScreen from '../screens/home/HomeScreen';
import SearchScreen from '../screens/home/SearchScreen';
import ChatScreen from '../screens/messages/ChatScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import AddPostScreen from '../screens/profile/AddPostScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import PostDetailsScreen from '../screens/profile/PostDetailsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import TryOnScreen from '../screens/profile/TryOnScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import ActivityScreen from '../screens/settings/ActivityScreen';
import PrivacyScreen from '../screens/settings/PrivacyScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ItemDetailsScreen from '../screens/swap/ItemDetailsScreen';
import SwapScreen from '../screens/swap/SwapScreen';


const Stack = createNativeStackNavigator();

export default function Navigation() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Swap" component={SwapScreen} />
      <Stack.Screen name="ItemDetails" component={ItemDetailsScreen} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Favorites" component={FavouritesScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="AddPost" component={AddPostScreen} />
      <Stack.Screen name="PostDetails" component={PostDetailsScreen} />
      <Stack.Screen name="TryOnScreen" component={TryOnScreen} />
      <Stack.Screen name="Activity" component={ActivityScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
      <Stack.Screen name="ManageAccount" component={ManageAccountScreen} />
      <Stack.Screen name="ManageComments" component={ManageCommentsScreen} />
    </Stack.Navigator>
  );
}