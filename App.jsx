// App.js
import React, { useState } from "react";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { RootSiblingParent } from "react-native-root-siblings";
import { AuthProvider } from "./src/contexts/auth";
import { NetworkProvider } from "./src/contexts/network";
import Routes from "./src/routes/routes";
import NetworkBanner from "./src/components/NetworkBanner";
import ErrorBoundary from "./src/components/ErrorBoundary";

export default function App() {
  const navigationRef = useNavigationContainerRef();
  const [currentRoute, setCurrentRoute] = useState(null);

  return (
    // ErrorBoundary global — captura exceções de render/lifecycle dentro
    // dos providers e da navegação. Não substitui crash do nativo nem
    // promise rejection global; só erros de árvore React.
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
