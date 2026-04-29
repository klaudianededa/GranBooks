package com.example.granbooks;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends AppCompatActivity {

    private WebView myWebView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        myWebView = findViewById(R.id.webview);

        WebSettings webSettings = myWebView.getSettings();

        // --- 1. ATIVA O PODER TOTAL DO JAVASCRIPT ---
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true); // Vital para Firebase Auth
        webSettings.setDatabaseEnabled(true);   // Vital para Firestore

        // --- 2. PERMISSÕES DE ARQUIVO (Híbrido) ---
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setAllowFileAccessFromFileURLs(true);
        webSettings.setAllowUniversalAccessFromFileURLs(true);

        // --- 3. LIBERA COOKIES (Vital para Login) ---
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(myWebView, true);

        // --- 4. CONFIGURAÇÕES EXTRAS ---
        // Garante que links abram dentro do app
        myWebView.setWebViewClient(new WebViewClient());
        // Permite logs melhores e alertas
        myWebView.setWebChromeClient(new WebChromeClient());

        // Carrega o site
        myWebView.loadUrl("file:///android_asset/index.html");

        // Botão Voltar
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (myWebView.canGoBack()) {
                    myWebView.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });
    }
}