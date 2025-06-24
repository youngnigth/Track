document.addEventListener("DOMContentLoaded", () => {
  const videoList = document.getElementById("video-list");

  const uploadedVideos = [
    {
      videoUrl: "videos/sample3.mp4",
      topic: "Neural Networks Explained",
      transcript: "Neural networks are modeled after the human brain..."
    },
    {
      videoUrl: "videos/sample2.mp4",
      topic: "Machine Learning Basics",
      transcript: "In this session, we cover the fundamentals of ML..."
    },
    {
      videoUrl: "videos/sample1.mp4",
      topic: "Introduction to AI",
      transcript: "This video explains what artificial intelligence is..."
    }
  ];

  uploadedVideos.forEach(video => {
    const videoItem = document.createElement("div");
    videoItem.className = "video-item";

    videoItem.innerHTML = `
      <video controls src="${video.videoUrl}"></video>
      <div class="video-topic">${video.topic}</div>
      <div class="video-transcript">${video.transcript}</div>
    `;

    videoList.appendChild(videoItem);
  });
});
