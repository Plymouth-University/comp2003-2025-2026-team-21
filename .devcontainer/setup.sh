urce#!/bin/bash

echo "🚀 UniVerse Dev Environment Setup Starting..."

# Install frontend dependencies
if [ -d "SourceCode/frontend" ]; then
  echo "📦 Installing frontend dependencies..."
  cd SourceCode/frontend || exit
  npm install

  # Install SecureStore if not present
  if ! grep -q "expo-secure-store" package.json; then
    echo "📦 Installing expo-secure-store..."
    npx expo install expo-secure-store
  fi

  cd ../../
fi


# Install backend dependencies
if [ -d "SourceCode/Backend" ]; then
  echo "📦 Installing backend dependencies..."
  cd SourceCode/Backend || exit
  npm install
  cd ../../
fi

echo "🎉 UniVerse Dev Environment Setup Complete!"
