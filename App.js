// App.js
import React, { useState } from "react";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { RootSiblingParent } from "react-native-root-siblings";
import { AuthProvider } from "./src/contexts/auth";
import { NetworkProvider } from "./src/contexts/network";
import Routes from "./src/routes/routes";
import NetworkBanner from "./src/components/NetworkBanner";
import ErrorBoundary from "./src/components/ErrorBoundary";
import Obras from "./src/pages/Notification/construction";


export default function App() {
  const navigationRef = useNavigationContainerRef();
  const [currentRoute, setCurrentRoute] = useState(null);

  return (
    // P1.7 security-port: ErrorBoundary global captura excecoes de
    // render/lifecycle e evita o crash branco do RN, mostrando uma tela
    // amigavel com botao de reinicio. Nao cobre crash nativo nem promise
    // rejection global.
    <ErrorBoundary>
      <RootSiblingParent>
        <AuthProvider>
          <NetworkProvider>
            <NavigationContainer
              ref={navigationRef}
              onReady={() => setCurrentRoute(navigationRef.getCurrentRoute()?.name)}
              onStateChange={() => setCurrentRoute(navigationRef.getCurrentRoute()?.name)}
            >
              {/* 🔹 Oculta o banner em Login e Splash */}
              {currentRoute !== "Login" && currentRoute !== "Splash" && <NetworkBanner />}

              {/* 🔹 Suas rotas principais */}
              <Routes />
            </NavigationContainer>
          </NetworkProvider>
        </AuthProvider>
      </RootSiblingParent>
    </ErrorBoundary>
  );
}
