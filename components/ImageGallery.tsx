import React, { useState } from "react";
import { Dimensions, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { colors } from "@/constants/theme";

const { width } = Dimensions.get("window");

export function ImageGallery({ images, height = 420 }: { images: string[]; height?: number }) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) return null;

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      >
        {images.map((uri, i) => (
          <Image
            key={i}
            source={{ uri }}
            style={{ width, height }}
            contentFit="cover"
            transition={200}
          />
        ))}
      </ScrollView>
      {images.length > 1 && (
        <View className="flex-row justify-center gap-1.5 mt-3">
          {images.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === index ? 18 : 6,
                height: 3,
                backgroundColor: i === index ? colors.primaryContainer : colors.surfaceHigh,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
