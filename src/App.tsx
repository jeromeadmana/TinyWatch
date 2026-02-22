import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types/navigation";
import RoleSelectionScreen from "./screens/RoleSelectionScreen";
import SenderScreen from "./screens/SenderScreen";
import ReceiverScreen from "./screens/ReceiverScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="RoleSelection"
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        <Stack.Screen name="Sender" component={SenderScreen} />
        <Stack.Screen name="Receiver" component={ReceiverScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
