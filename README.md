## Requisitos

* Node.js 20 ou superior
* Expo

## Como rodar o projeto baixado

Alterar no arquivo "src/config/api.js". Atribuir o IP onde está a API. No curso, a API é executada no próprio PC, então coloque o IP do PC. Para recuperar o IP, execute no terminal o comando.
```
ipconfig
```

Instalar todas as dependencias indicada no package.json.
```
npm install
```

Executar o projeto.
```
npx expo start
```

Baixar o aplicativo Expo Go da Play Store e App Store.<br>
Ler o QRCode da aplicação com o aplicativo Expo Go.<br>


## Sequencia para criar o projeto

Criar o projeto com React Native usando expo.
```
npx create-expo-app . --template
```

Na instalação utilizar o template "Blank".

Executar o projeto.
```
npx expo starty
```

Baixar o aplicativo Expo Go da Play Store e App Store.<br>
Ler o QRCode da aplicação com o aplicativo Expo Go.<br>

Dependência para navegar entre as página.
```
npm install @react-navigation/native @react-navigation/native-stack
```
```
npx expo install react-native-screens react-native-safe-area-context
```

Realizar chamada para API.
```
npm install axios
```

Validar formulário
```
npm install yup
```

Transforma o CSS em componentes
```
npm install styled-components
```

AsyncStorage é utilizada para armazenar dados persistentes no dispositivo
```
npx expo install @react-native-async-storage/async-storage
```

Instalar Drawer Navigator - Gaveta de navegação.
```
npm install @react-navigation/drawer
```
```
npx expo install react-native-gesture-handler react-native-reanimated
```

Biblioteca de ícones.
```
npm install --save react-native-vector-icons
```


## Como usar o GitHub

Instalar o Git: https://git-scm.com<br>

Baixar os arquivos do GitHub.
```
git clone --branch <branch_name> <repository_url> .
```

Verificar a branch.
```
git branch 
```

Baixar as atualizações.
```
git pull
```

Adicionar todos os arquivos modificados no staging area - área de preparação.
```
git add .
```

Representa um conjunto de alterações em um ponto específico da história do seu projeto, registra apenas as alterações adicionadas ao índice de preparação.
O comando -m permite que insira a mensagem de commit diretamente na linha de comando.
```
git commit -m "Descrição do commit"
```

Enviar os commits locais, para um repositório remoto.
```
git push <remote> <branch>
git push origin dev-master
```

