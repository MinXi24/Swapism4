// navigation/Navigation.js
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import LoginScreen from '../screens/auth/LoginScreen';
// import SignupScreen from '../screens/auth/SignupScreen';
 import HomeScreen from '../screens/home/HomeScreen';
// import ItemDetailsScreen from '../screens/home/ItemDetailsScreen';
// import ChatScreen from '../screens/messages/ChatScreen';
// import MessagesScreen from '../screens/messages/MessagesScreen';
// import AddPostScreen from '../screens/profile/AddPostScreen';
// import ProfileScreen from '../screens/profile/ProfileScreen';
// import SettingsScreen from '../screens/settings/SettingsScreen';
// import other screens as needed

const Stack = createNativeStackNavigator();

export default function Navigation() {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      {/* <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ItemDetails" component={ItemDetailsScreen} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="AddPost" component={AddPostScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} /> */}
      {/* Add other screens here */}
    </Stack.Navigator>
  );
}
