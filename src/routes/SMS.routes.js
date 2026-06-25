// src/routes/segurancadotrabalho.routes.js <Stack.Screen name="SegurancaDoTrabalho" component={SegurancaDoTrabalho} options={{ title: 'Segurança Do Trabalho' }} />
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SMSHome from '@/pages/SMS/SMSHome';
import SMSChecklists from '@/pages/SMS/SMSChecklists';
import SMSListaObras from '@/pages/SMS/SMSListaObras';
import SMSChecklistResponder from '@/pages/SMS/SMSChecklistResponder';
import SMSChecklistGerenciar from '@/pages/SMS/SMSChecklistGerenciar';

const Stack = createNativeStackNavigator();

export default function SMSRoutes() {
  return (
    <Stack.Navigator
      initialRouteName="SMSInit"
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffffff' },
        headerTintColor: '#333',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="SMSHome"
        component={SMSHome}
        options={{ title: 'Segurança do trabalho' }}
      />
      <Stack.Screen
        name="SMSChecklists"
        component={SMSChecklists}
        options={{ title: 'Checklists' }}
      />

      <Stack.Screen
        name="SMSListaObras"
        component={SMSListaObras}
        options={{ title: 'Obras' }}
      />

      <Stack.Screen
        name="SMSChecklistGerenciar"
        component={SMSChecklistGerenciar}
        options={({ route }) => ({
          title: route.params?.checklist_nome || "Checklist",
        })}
      />

      <Stack.Screen
        name="SMSChecklistResponder"
        component={SMSChecklistResponder}
        options={({ route }) => ({
          title: route.params?.checklist_nome || "Responder Checklist",
        })}
      />

    </Stack.Navigator>
  );
}

