import { render, screen } from "@testing-library/react";
import { LanguageProvider, useLanguage } from "@/context/LanguageProvider";
import React from "react";

const TestComponent = () => {
  const { t, setLang } = useLanguage();

  return (
    <div>
      <p data-testid="welcome-message">{t("welcome")}</p>
      <button onClick={() => setLang("sw")} data-testid="sw-button">Swahili</button>
      <button onClick={() => setLang("zu")} data-testid="zu-button">Zulu</button>
      <button onClick={() => setLang("fr")} data-testid="fr-button">Unsupported</button>
    </div>
  );
};

describe("LanguageProvider", () => {
  it("should default to English translations", async () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    expect(screen.getByTestId("welcome-message").textContent).toBe("Welcome to Pulse Connect!");
  });

  it("should switch to Swahili translations", async () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    screen.getByTestId("sw-button").click();
    expect(screen.getByTestId("welcome-message").textContent).toBe("Karibu Pulse Connect!");
  });

  it("should switch to Zulu translations", async () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    screen.getByTestId("zu-button").click();
    expect(screen.getByTestId("welcome-message").textContent).toBe("Siyakwamukela ku-Pulse Connect!");
  });

  it("should fall back to English for unsupported languages", async () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    screen.getByTestId("fr-button").click();
    expect(screen.getByTestId("welcome-message").textContent).toBe("Welcome to Pulse Connect!");
  });
});
