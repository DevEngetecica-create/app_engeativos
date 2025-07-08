// components/ProtectedRoute.js
import React, { useContext } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { AuthContext } from '../contexts/auth';

export default function ProtectedRoute({ children }) {
    const { isAuthenticated, loadingAuth } = useContext(AuthContext);

    if (loadingAuth) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!isAuthenticated) {
        return null; // O AuthProvider já redireciona para Login
    }

    return children;
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    }
});