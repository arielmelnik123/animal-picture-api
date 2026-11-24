export async function fetchAnimalPicture(animal) {
  const width = 400 + Math.floor(Math.random() * 40);
  const height = 300 + Math.floor(Math.random() * 40);

  const sources = {
    cat: [
      `https://placekitten.com/${width}/${height}`,
      'https://cataas.com/cat'
    ],
    dog: [
      `https://place.dog/${width}/${height}`,
      `https://placedog.net/${width}/${height}`
    ],
    bear: [
      `https://placebear.com/${width}/${height}`,
      `https://placebear.com/g/${width}/${height}`
    ]
  };

  for (const url of sources[animal]) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) continue;

      const mimeType = (response.headers.get('content-type') || '').split(';')[0];
      if (!mimeType.startsWith('image/')) continue;

      const image = Buffer.from(await response.arrayBuffer());
      if (image.length === 0 || image.length > 3_000_000) continue;

      return { image, mimeType, sourceUrl: url };
    } catch {
      // If this website fails, try the next one.
    }
  }

  throw new Error(`Could not download a ${animal} picture`);
}