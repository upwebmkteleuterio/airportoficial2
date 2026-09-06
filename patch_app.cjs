const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const importSplash = `import { AITestSuite } from './components/AITestSuite';
import { SplashVideo } from './components/SplashVideo';`;

content = content.replace("import { AITestSuite } from './components/AITestSuite';", importSplash);

const appFunction = `export default function App() {
  const [showSplash, setShowSplash] = React.useState(true);
  const splashVideoUrl = "https://storage.filebin.net/filebin/ac98c4b4891eadc12f881be13cf38d64e5b0de71ff98dc97aad7157c301ff2ac?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=GK352fd2505074fc9dde7fd2cb%2F20260717%2Fhel1-dc4%2Fs3%2Faws4_request&X-Amz-Date=20260717T011756Z&X-Amz-Expires=900&X-Amz-SignedHeaders=host&response-cache-control=max-age%3D900&response-content-disposition=inline%3B%20filename%3D%22Animacao%20Airport%201%20%281%29.mp4%22&response-content-type=video%2Fmp4&x-id=GetObject&X-Amz-Signature=594ab723f4d8c3e745c249175ee86f2c49d68a9459851666a1f56d2caf6e6f3b";

  if (showSplash) {
    return <SplashVideo onFinish={() => setShowSplash(false)} videoUrl={splashVideoUrl} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}`;

content = content.replace(/export default function App\(\) \{\s*return \(\s*<QueryClientProvider client=\{queryClient\}>\s*<AppContent \/>\s*<\/QueryClientProvider>\s*\);\s*\}/s, appFunction);

if (!content.includes('import React')) {
    content = content.replace("import { useEffect }", "import React, { useEffect }");
}

fs.writeFileSync('src/App.tsx', content);
