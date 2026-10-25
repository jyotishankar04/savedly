"use client";

import React from "react";
import type { UIMessage } from "ai";
import { Streamdown } from "streamdown";
import { MessageScrollerItem } from "@/components/ui/message-scroller";
import { Message, MessageContent } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { HelpActions } from "@/components/ask/help-actions";
import { EventResultCard, isEventToolName, parseEventToolOutput } from "@/components/ask/event-result-card";
import { ConfirmActionCard, pendingConfirmations } from "@/components/ask/confirm-action-card";
import { ReferencedMemoryCards, SearchToolPart } from "@/components/ask/search-results";
import { getReferencedMemories, isMemorySearchToolName } from "@/lib/ask-results";
import { toolActivityLabel } from "@/lib/ask-tools";

/** One turn of the conversation: the user's bubble, or the assistant's text, tool activity, cards and references. */
export function ChatMessage({
  message,
  isLastMessage,
  isBusy,
  send,
  limitReached,
}: {
  message: UIMessage;
  isLastMessage: boolean;
  isBusy: boolean;
  send: (text: string) => void;
  limitReached: boolean;
}) {
  // Between a tool call finishing and the reply's first text
  // token, the message has parts (so the top-level
  // "Thinking…" block — gated on status "submitted" —
  // has already stopped rendering) but nothing visible was
  // shown for that gap. Perplexity-style "Generating a
  // response…" fills it, without duplicating the search
  // marker's own "Searching…" shimmer while a tool call is
  // still in flight.
  const toolParts = message.parts.filter((p) => p.type === "dynamic-tool");
  const hasPendingTool = toolParts.some((p) => p.state === "input-streaming" || p.state === "input-available");
  const hasText = message.parts.some((p) => p.type === "text" && p.text);
  const showGenerating =
    isLastMessage && message.role === "assistant" && isBusy && toolParts.length > 0 && !hasPendingTool && !hasText;
  const referencedMemories = message.role === "assistant" ? getReferencedMemories(message.parts) : [];

  return (
                    <MessageScrollerItem messageId={message.id} scrollAnchor={message.role === "user"}>
                      <Message align={message.role === "user" ? "end" : "start"}>
                        <MessageContent>
                          {message.parts.map((part, i) => {
                            if (part.type === "text" && part.text) {
                              const isUser = message.role === "user";
                              return (
                                <Bubble key={i} align={isUser ? "end" : "start"} variant={isUser ? "default" : "ghost"}>
                                  <BubbleContent>
                                    {isUser ? (
                                      part.text
                                    ) : (
                                      <Streamdown isAnimating={isBusy && isLastMessage}>{part.text}</Streamdown>
                                    )}
                                  </BubbleContent>
                                </Bubble>
                              );
                            }
                            if (part.type === "dynamic-tool" && isMemorySearchToolName(part.toolName)) {
                              return <SearchToolPart key={i} part={part} />;
                            }
                            if (part.type === "dynamic-tool" && part.toolName === "get_platform_help" && (part.state === "input-streaming" || part.state === "input-available")) {
                              return (
                                <span key={i} className="shimmer text-xs text-muted-foreground px-2.5">
                                  Checking the Help Center&hellip;
                                </span>
                              );
                            }
                            if (
                              part.type === "dynamic-tool" &&
                              (part.state === "input-streaming" || part.state === "input-available") &&
                              toolActivityLabel(part.toolName)
                            ) {
                              return (
                                <span key={i} className="shimmer text-xs text-muted-foreground px-2.5">
                                  {toolActivityLabel(part.toolName)}
                                </span>
                              );
                            }
                            return null;
                          })}
                          {/* An event Ask added or moved: a card under the reply with buttons to open it. */}
                          {message.role === "assistant" &&
                            message.parts.map((part, i) => {
                              if (part.type !== "dynamic-tool" || !isEventToolName(part.toolName) || part.state !== "output-available") return null;
                              const event = parseEventToolOutput(part.output);
                              return event ? (
                                <div key={`event-${i}`} className="px-1">
                                  <EventResultCard event={event} />
                                </div>
                              ) : null;
                            })}
                          {/* Ask is waiting for a yes before it changes anything: only on the latest reply, where the answer still counts. */}
                          {message.role === "assistant" && isLastMessage && !isBusy && (
                            <div className="px-1">
                              <ConfirmActionCard actions={pendingConfirmations(message.parts)} onAnswer={send} disabled={limitReached} />
                            </div>
                          )}
                          {message.role === "assistant" && hasText && !(isBusy && isLastMessage) && <HelpActions parts={message.parts} />}
                          {showGenerating && (
                            <span className="shimmer text-xs text-muted-foreground px-2.5">
                              Generating a response&hellip;
                            </span>
                          )}
                          {referencedMemories.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5">
                                Referenced
                              </span>
                              <ReferencedMemoryCards memories={referencedMemories} />
                            </div>
                          )}
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
  );
}
