## Screenshots
<div align="center">
  <img src="public/images/screenshoots_app/dashboard.png" alt="Dashboard" />
</div>

## React Compiler
The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Compile

First compile for folder /dist
```bash  
   npm run build  
``` 

Compile & sync android
```bash  
   npx cap sync android  
```

Build apk
```bash  
   cd android; .\gradlew.bat assembleDebug  
```