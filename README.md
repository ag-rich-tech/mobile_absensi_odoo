## Screenshots App
<div align="center">
  <img src="public/images/screenshoots_app/dashboard.png" alt="Dashboard" />
</div>

## How to Compile

1. First compile for folder /dist
```bash  
   npm run build  
``` 

2. Compile & sync android
```bash  
   npx cap sync android  
```

3. Build apk
```bash  
   cd android; .\gradlew.bat assembleDebug  
```
Folder output app
```bash
android\app\build\outputs\apk\debug\app-debug.apk
```