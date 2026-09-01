import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { StatCard } from "@/components/ui/Chips";
import { PostGrid } from "@/components/PostGrid";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { apiService } from "@/services/apiService";
import { useToggleFollow } from "@/stores/socialStore";
import { FollowListSheet, type FollowTab } from "@/components/FollowListSheet";
import { ProfileEvents } from "@/components/ProfileEvents";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { carTitle } from "@/utils/car";
import { colors, spacing, typography } from "@/constants/theme";

const SCREEN_PAD = spacing.marginMobile;

function BackHeader({ title }: { title: string }) {
  return (
    <AppHeader
      title={title}
      left={
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.onSurface} />
        </Pressable>
      }
    />
  );
}

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { width } = useWindowDimensions();
  const { data: me } = useCurrentUser();

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", username],
    queryFn: () => apiService.getUserByUsername(username),
    enabled: !!username,
  });
  const { data: carsPage } = useQuery({
    queryKey: ["cars-by-username", username],
    queryFn: () => apiService.getCarsByUsername(username, 1, 20),
    enabled: !!username,
  });
  const { data: postsPage } = useQuery({
    queryKey: ["posts-by-username", username, 1, 30],
    queryFn: () => apiService.getPostsByUsername(username, 1, 30),
    enabled: !!username,
  });
  const toggleFollow = useToggleFollow(username);
  const [followSheet, setFollowSheet] = useState<FollowTab | null>(null);

  const userCars = carsPage?.data ?? [];
  const userPosts = postsPage?.data ?? [];

  if (isLoading) {
    return (
      <View className="flex-1 bg-surface">
        <BackHeader title="PERFIL" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-surface">
        <BackHeader title="PERFIL" />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-on-surface-variant text-center">
            Não encontramos o perfil @{username}.
          </Text>
        </View>
      </View>
    );
  }

  const isMe = me?.username === user.username;
  const isFollowing = !!user.isFollowing;

  return (
    <View className="flex-1 bg-surface">
      <BackHeader title={`@${user.username}`} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="px-4 mt-2">
          <UserAvatar uri={user.avatarUrl ?? ""} size={96} ringColor={colors.primaryContainer} />
          <Text className="text-on-surface mt-4" style={typography.headlineSm}>
            {user.displayName}
          </Text>
          <Text className="text-on-surface-variant mt-1" style={typography.bodyMd}>
            @{user.username} · Gearhead desde {user.gearheadSince ?? "—"}
          </Text>
          {user.bio && (
            <Text className="text-on-surface-variant mt-2" style={{ fontSize: 14 }}>
              {user.bio}
            </Text>
          )}

          {!isMe && (
            <View className="mt-5">
              {isFollowing ? (
                <SecondaryButton
                  label="Seguindo"
                  onPress={() => toggleFollow.mutate({ userId: user.id, following: true })}
                />
              ) : (
                <PrimaryButton
                  label="Seguir"
                  onPress={() => toggleFollow.mutate({ userId: user.id, following: false })}
                />
              )}
            </View>
          )}

          <View className="flex-row border-t border-b border-border mt-6 py-1">
            <StatCard label="Carros" value={String(userCars.length)} />
            <StatCard label="Projetos" value={String(user.projectsCount)} />
            <StatCard label="Rolês" value={String(user.eventsAttendedCount ?? 0)} />
            <StatCard
              label="Seguidores"
              value={String(user.followersCount)}
              onPress={() => setFollowSheet("followers")}
            />
            <StatCard
              label="Seguindo"
              value={String(user.followingCount)}
              onPress={() => setFollowSheet("following")}
            />
          </View>
        </View>

        {/* Perfil de quem não tem carro não mostra garagem vazia: nem todo
            mundo aqui tem carro — tem quem venha pelas fotos e pelos rolês —
            e anunciar o vazio faria a conta parecer incompleta. */}
        {userCars.length > 0 && (
          <View className="mt-7">
            <Text className="text-on-surface px-4 mb-3" style={typography.labelCaps}>
              Garagem
            </Text>
            {(
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SCREEN_PAD, gap: 12 }}
            >
              {userCars.map((car) => (
                <Pressable
                  key={car.id}
                  onPress={() => router.push(`/car/${car.id}`)}
                  className="border border-border bg-card overflow-hidden active:opacity-90"
                  style={{ width: 220 }}
                >
                  <View style={{ height: 150 }}>
                    {car.photoUrl && (
                      <Image
                        source={{ uri: car.photoUrl }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                    )}
                  </View>
                  <View className="p-3">
                    <Text
                      className="text-on-surface"
                      style={{ fontSize: 14, fontWeight: "600" }}
                      numberOfLines={1}
                    >
                      {carTitle(car)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            )}
          </View>
        )}

        <ProfileEvents
          username={user.username}
          isOrganizer={!!user.isOrganizer}
          isMe={isMe}
        />

        <View className="mt-8 px-4">
          <Text className="text-on-surface mb-3" style={typography.labelCaps}>
            Publicações
          </Text>
        </View>
        {userPosts.length === 0 ? (
          <Text className="text-on-surface-variant px-4" style={{ fontSize: 13 }}>
            Nenhuma publicação ainda.
          </Text>
        ) : (
          <PostGrid posts={userPosts} width={width} username={user.username} />
        )}
      </ScrollView>

      <FollowListSheet
        userId={user.id}
        tab={followSheet ?? "followers"}
        onTabChange={setFollowSheet}
        visible={followSheet !== null}
        onClose={() => setFollowSheet(null)}
      />
    </View>
  );
}
