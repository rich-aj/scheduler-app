import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

// Import screens
import LandingScreen from './screens/LandingScreen';
import LoginScreen from './screens/LoginScreen';
import AdminDashboard from './screens/AdminDashboard';
import TeamDashboard from './screens/TeamDashboard';
import CreateSchedule from './screens/CreateSchedule';
import ManageRequests from './screens/ManageRequests';
import RequestChange from './screens/RequestChange';
import ViewSchedule from './screens/ViewSchedule';
import TeamManagement from './screens/TeamManagement';
import ViewMySchedule from './screens/ViewMySchedule';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Landing"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
        <Stack.Screen name="TeamDashboard" component={TeamDashboard} />
        <Stack.Screen name="CreateSchedule" component={CreateSchedule} />
        <Stack.Screen name="ManageRequests" component={ManageRequests} />
        <Stack.Screen name="RequestChange" component={RequestChange} />
        <Stack.Screen name="ViewSchedule" component={ViewSchedule} />
        <Stack.Screen name="TeamManagement" component={TeamManagement} />
        <Stack.Screen name="ViewMySchedule" component={ViewMySchedule} />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}