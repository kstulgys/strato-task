import { data, useSearchParams } from "react-router";
import { FloorPlanRenderer } from "../lib/llm-floor-planner/floor-plan-renderer";
import React from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLoaderData } from "react-router";
import type { Id } from "~/convex/_generated/dataModel";

export async function loader() {
  const CONVEX_URL = process.env["VITE_CONVEX_URL"]!;
  return { ENV: { CONVEX_URL } };
}

export default function Chat() {
  return (
    <div className="h-screen flex text-gray-900">
      <div className="h-screen flex-8 bg-gray-100">
        <FloorPlanRenderer />
      </div>
      <div className="h-screen flex-2 bg-gray-100">
        <Aside />
      </div>
    </div>
  );
}

function Aside() {
  const { ENV } = useLoaderData<typeof loader>();

  const [isAudioEnabled, setIsAudioEnabled] = React.useState(false);

  const audioRef = React.useRef<HTMLAudioElement>(null);
  // messages container ref
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const threadId = searchParams.get("threadId");
  const storeyId = searchParams.get("storeyId") as Id<"storey"> | null;

  const createThread = useAction(api.agent.createThread);

  const continueThread = useAction(api.agent.continueThread);
  const lastTts = useQuery(api.tts.byStoreyId, {
    storeyId,
  });

  const createStorey = useMutation(api.storey.create);

  const messages = useQuery(api.agent.getThreadMessages, {
    threadId: threadId!,
  });

  const [message, setMessage] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  console.log({ messages });

  React.useEffect(() => {
    // get last message
    const lastMessage = messages?.page[messages?.page.length - 1];
    if (!lastMessage || !threadId || !storeyId) return;
    if (lastMessage?.message?.role === "assistant") {
      (async () => {
        if (lastTts?.audioUrl && lastMessage.text === lastTts?.message) {
          if (audioRef.current) {
            audioRef.current.src = lastTts.audioUrl;
            audioRef.current.play();
          }
        }
      })();
    }
  }, [messages, threadId, storeyId, lastTts]);

  // const talk = () => {
  //   const lastMessage = messages?.page[messages?.page.length - 1];
  //   if (!lastMessage || !threadId) return;
  //   if (lastMessage?.message?.role === "assistant") {
  //     (async () => {
  //       if (lastTts?.audioUrl && lastMessage.text === lastTts.message) {
  //         if (audioRef.current) {
  //           audioRef.current.src = lastTts.audioUrl;
  //           audioRef.current.play();
  //         }
  //       }
  //     })();
  //   }
  // };

  const disableAudio = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  };

  const enableAudio = () => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
    }
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        enableAudio();
      } else {
        disableAudio();
      }
    }
    setIsAudioEnabled((prev) => !prev);
  };

  // smooth scroll to bottom of messages container
  React.useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  React.useEffect(() => {
    if (!threadId || !storeyId) {
      (async () => {
        let t = threadId || (await createThread()).threadId;
        let s = storeyId || (await createStorey({ threadId: t! })).storeyId;
        setSearchParams(`?storeyId=${s}&threadId=${t}`);
      })();
    }
  }, [storeyId, threadId]);

  const restartThread = async () => {
    const t = await createThread();
    setSearchParams(`?storeyId=${storeyId!}&threadId=${t.threadId}`);
  };

  return (
    <div className="h-full p-6 min-w-md max-w-md">
      <div>
        <button onClick={restartThread}>Restart</button>
      </div>
      <div className="bg-gray-300 rounded-xl p-3">
        <div className="h-full">
          <div
            ref={messagesContainerRef}
            className="overflow-y-auto h-[600px] flex flex-col gap-6"
          >
            {messages?.page?.slice(-20).map((msg) => {
              if (
                !msg.text ||
                !["user", "assistant"].includes(msg.message?.role ?? "")
              )
                return null;

              // const content = (() => {
              //   if (msg.message?.content?.[0]?.type === "text") {
              //     return msg.message?.content?.[0]?.text;
              //   }
              //   return null;
              // })();
              return (
                <div
                  className="text-sm"
                  key={msg._id}
                  style={{
                    textAlign: msg.message?.role === "user" ? "right" : "left",
                  }}
                >
                  {/* <div>{msg.text}</div> */}
                  <div>
                    <Markdown remarkPlugins={[remarkGfm]}>{msg.text}</Markdown>
                  </div>
                  {/* {content ? (
                  ) : (
                  )} */}
                </div>
              );
            })}
          </div>
        </div>
        {isLoading ? (
          <p>Thinking...</p>
        ) : (
          <button onClick={toggleAudio} className="text-sm">
            Toggle audio
          </button>
        )}
        <form
          className="w-full"
          onSubmit={async (e) => {
            if (!threadId || !message) return;
            e.preventDefault();
            setIsLoading(true);
            let prevMessage = message;
            try {
              setMessage("");
              await continueThread({
                prompt: prevMessage,
                threadId: threadId!,
                storeyId: storeyId!,
              });
            } catch (error) {
              setMessage(prevMessage);
              console.error(error);
            } finally {
              setIsLoading(false);
            }
          }}
        >
          <div>
            <textarea
              name=""
              id=""
              className="w-full border-2 border-gray-400 rounded-md p-2 bg-white"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={async (e) => {
                if (!threadId || !message) return;
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsLoading(true);
                  let prevMessage = message;
                  try {
                    setMessage("");
                    await continueThread({
                      prompt: prevMessage,
                      threadId: threadId!,
                      storeyId: storeyId!,
                    });
                  } catch (error) {
                    setMessage(prevMessage);
                    console.error(error);
                  } finally {
                    setIsLoading(false);
                  }
                }
              }}
            />
          </div>
          <div>
            <button className="text-sm hidden" type="submit" />
          </div>
        </form>
      </div>
      {isAudioEnabled && <audio ref={audioRef} />}
    </div>
  );
}
