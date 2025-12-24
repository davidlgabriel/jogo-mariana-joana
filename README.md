# Jogo de Carros - React Native/Expo

Um jogo de carros inspirado em "Detona Ralph", onde você coleta doces enquanto dirige um carro personalizado.

## Funcionalidades

- Personalização do carro com diferentes modelos e cores
- Adicionar decorações/adesivos ao carro
- Arrastar, girar e redimensionar decorações
- Jogo interativo onde você coleta doces
- Pontuação baseada nos doces coletados
- Aumento gradual da dificuldade

## Instalação

1. Certifique-se de ter o Node.js instalado
2. Instale o Expo CLI: `npm install -g expo-cli`
3. Clone este repositório
4. Execute `npm install` para instalar as dependências
5. Execute `npx expo start` para iniciar o aplicativo

## Como Jogar

1. Selecione um modelo de carro
2. Adicione decorações ao seu carro
3. Clique em "Confirmar" para iniciar o jogo
4. Deslize o dedo na tela para mover o carro
5. Colete todos os doces que caem para ganhar pontos
6. Evite deixar que os doces atinjam o fundo da tela

## Gerar um APK

Para gerar um APK para Android, siga os passos abaixo:

1. Instale o EAS CLI: `npm install -g eas-cli`
2. Faça login na sua conta Expo: `eas login`
3. Configure o build: `eas build:configure`
4. Crie um arquivo `eas.json` com o seguinte conteúdo:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {}
  }
}
```

5. Execute o comando para gerar o APK: `eas build -p android --profile preview`
6. Siga as instruções na tela para completar o processo
7. Baixe o APK gerado da página de builds do Expo

## Tecnologias Utilizadas

- React Native
- Expo
- React Native Reanimated
- React Native Gesture Handler
- Expo AV (para áudio)
- React Native SVG

## Estrutura do Projeto

```
/assets           - Imagens, ícones e sons
/src
  /components     - Componentes reutilizáveis
  /screens        - Telas do aplicativo
  /utils          - Funções utilitárias e dados
```

## Próximos Passos

- Adicionar mais modelos de carros
- Adicionar mais tipos de decorações
- Implementar sistema de níveis
- Adicionar powerups durante o jogo
- Salvar recordes localmente 