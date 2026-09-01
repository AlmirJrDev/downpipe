import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Alert } from "@/utils/alert";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { MoreHorizontal, Send, X } from "lucide-react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { RowSkeleton } from "@/components/ui/States";
import { useAddComment, useUpdateComment, useDeleteComment } from "@/stores/socialStore";
import { apiService } from "@/services/apiService";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { colors } from "@/constants/theme";
import { timeAgo } from "@/utils/time";
import type { Comment } from "@/types";

export function CommentsSheet({
  postId,
  visible,
  onClose,
}: {
  postId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const { data: me } = useCurrentUser();
  const addComment = useAddComment(postId);
  const updateComment = useUpdateComment(postId);
  const deleteComment = useDeleteComment(postId);
  const [text, setText] = useState("");
  // Editar reaproveita o campo de escrita lá embaixo em vez de transformar a
  // linha em input: o teclado já abre focado nele, e a lista continua rolável.
  const [editing, setEditing] = useState<Comment | null>(null);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["comments", postId],
    queryFn: ({ pageParam }) => apiService.getComments(postId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
    enabled: visible,
  });

  const comments = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const listRef = useRef<FlatList<Comment>>(null);

  const cancelEdit = () => {
    setEditing(null);
    setText("");
  };

  const submit = () => {
    if (!text.trim()) return;
    if (editing) {
      updateComment.mutate({ id: editing.id, text: text.trim() }, { onSuccess: cancelEdit });
      return;
    }
    addComment.mutate(text.trim(), {
      // A lista é do mais antigo pro mais novo: sem rolar, o comentário
      // recém-escrito nasce fora da área visível.
      onSuccess: () => listRef.current?.scrollToEnd({ animated: true }),
    });
    setText("");
  };

  const openMenu = (comment: Comment) => {
    Alert.alert("Comentário", undefined, [
      {
        text: "Editar",
        onPress: () => {
          setEditing(comment);
          setText(comment.text);
        },
      },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () =>
          Alert.alert("Excluir comentário", "Essa ação não pode ser desfeita.", [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Excluir",
              style: "destructive",
              onPress: () =>
                deleteComment.mutate(comment.id, {
                  // O comentário aberto pra edição pode ser justamente o
                  // excluído — sem isso o campo ficaria editando um id morto.
                  onSuccess: () => {
                    if (editing?.id === comment.id) cancelEdit();
                  },
                }),
            },
          ]),
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  // Só o autor do comentário edita/exclui — nem o dono do post pode (403).
  const isMine = (comment: Comment) => !!me && comment.author?.username === me.username;
  const busy = addComment.isPending || updateComment.isPending;

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        cancelEdit();
        onClose();
      }}
      title="Comentários"
    >
      <View style={{ maxHeight: 380 }}>
        <FlatList
          ref={listRef}
          data={comments}
          keyExtractor={(c) => c.id}
          style={{ maxHeight: 300 }}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? <RowSkeleton /> : null}
          ListEmptyComponent={
            !isLoading ? (
              <Text className="text-on-surface-variant px-5 py-6 text-center">
                Seja o primeiro a comentar.
              </Text>
            ) : (
              <View className="py-6 items-center">
                <ActivityIndicator color={colors.primary} />
              </View>
            )
          }
          renderItem={({ item }) => {
            const author = item.author;
            const mine = isMine(item);
            return (
              <View
                className="flex-row gap-3 px-5 py-3"
                style={{
                  backgroundColor: editing?.id === item.id ? colors.surfaceLow : "transparent",
                }}
              >
                <UserAvatar uri={author?.avatarUrl ?? ""} size={32} />
                <View className="flex-1">
                  <Text className="text-on-surface" style={{ fontSize: 13 }}>
                    <Text
                      style={{ fontWeight: "600" }}
                      onPress={() => {
                        if (!author) return;
                        onClose();
                        router.push(`/user/${author.username}`);
                      }}
                    >
                      @{author?.username}{" "}
                    </Text>
                    {item.text}
                  </Text>
                  {/* Todo o resto do app datava o conteúdo (feed,
                      notificações) — só o comentário aparecia solto no tempo. */}
                  <Text className="text-muted mt-1" style={{ fontSize: 11 }}>
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>
                {mine && (
                  <Pressable onPress={() => openMenu(item)} hitSlop={10}>
                    <MoreHorizontal size={16} color={colors.onSurfaceVariant} />
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      </View>

      {editing && (
        <View className="flex-row items-center justify-between px-5 pt-3">
          <Text className="text-primary" style={{ fontSize: 12, fontWeight: "600" }}>
            Editando comentário
          </Text>
          <Pressable onPress={cancelEdit} hitSlop={10} className="flex-row items-center gap-1">
            <X size={14} color={colors.onSurfaceVariant} />
            <Text className="text-on-surface-variant" style={{ fontSize: 12 }}>
              Cancelar
            </Text>
          </Pressable>
        </View>
      )}

      <View className="flex-row items-center gap-3 px-5 pt-3 border-t border-border">
        <UserAvatar uri={me?.avatarUrl ?? ""} size={32} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={editing ? "Edite seu comentário..." : "Adicione um comentário..."}
          placeholderTextColor={colors.muted}
          className="flex-1 text-on-surface py-2"
        />
        <Pressable onPress={submit} disabled={busy || !text.trim()} hitSlop={8}>
          {busy ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Send size={20} color={text.trim() ? colors.primary : colors.outline} />
          )}
        </Pressable>
      </View>
    </BottomSheet>
  );
}
