import { ComponentType, useEffect, useState } from "react";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";

interface WithAutoTranslateProps {
  translateProps?: string[];
  excludeProps?: string[];
}

export function withAutoTranslate<P extends Record<string, any>>(
  WrappedComponent: ComponentType<P>,
  options: WithAutoTranslateProps = {}
) {
  const {
    translateProps = [
      "title",
      "description",
      "content",
      "text",
      "label",
      "placeholder",
      "message",
    ],
    excludeProps = ["id", "className", "style"],
  } = options;

  return function TranslatedComponent(props: P) {
    const { translateObject } = useAutoTranslate();
    const [translatedProps, setTranslatedProps] = useState<P>(props);

    useEffect(() => {
      async function translateProps() {
        const propsToTranslate = Object.entries(props).reduce(
          (acc, [key, value]) => {
            if (
              (translateProps.includes(key) || typeof value === "string") &&
              !excludeProps.includes(key)
            ) {
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, any>
        );

        if (Object.keys(propsToTranslate).length > 0) {
          const translated = await translateObject(propsToTranslate);
          setTranslatedProps({ ...props, ...translated });
        }
      }

      translateProps();
    }, [props]);

    return <WrappedComponent {...translatedProps} />;
  };
}
