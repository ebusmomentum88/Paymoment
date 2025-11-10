// ===== script.js =====

// Fetch and display news
document.addEventListener("DOMContentLoaded", async () => {
  const newsList = document.getElementById("news-list");

  try {
    const response = await fetch("http://localhost:5000/api/news"); // adjust URL if needed
    if (!response.ok) throw new Error("Failed to load news");

    const newsData = await response.json();
    renderNews(newsData);
  } catch (error) {
    console.error("Error fetching news:", error);
    newsList.innerHTML = `<p style="text-align:center;color:#888;">No news available at the moment.</p>`;
  }

  // Function to render news list
  function renderNews(newsData) {
    newsList.innerHTML = "";

    newsData.forEach(news => {
      const card = document.createElement("div");
      card.className = "news-card";

      card.innerHTML = `
        <img src="${news.imageUrl || 'default-news.jpg'}" class="news-image" alt="News Image">
        <div class="news-content">
          <h3 class="news-title">${news.title}</h3>
          <p class="news-text">${truncate(news.content, 150)}</p>
          <span class="read-more">Read more</span>
        </div>
      `;

      // Read more toggle
      const readMore = card.querySelector(".read-more");
      const text = card.querySelector(".news-text");
      let expanded = false;

      readMore.addEventListener("click", () => {
        expanded = !expanded;
        text.textContent = expanded ? news.content : truncate(news.content, 150);
        readMore.textContent = expanded ? "Show less" : "Read more";
      });

      newsList.appendChild(card);
    });
  }

  function truncate(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  }
});
