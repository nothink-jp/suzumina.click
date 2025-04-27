#!/usr/bin/env node

/**
 * Firestoreエミュレーターにサンプルデータを追加するスクリプト
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp, connectFirestoreEmulator } from 'firebase/firestore';

// Firebase設定
const firebaseConfig = {
  apiKey: 'dummy-api-key',
  authDomain: 'dummy-project.firebaseapp.com',
  projectId: 'dummy-project',
  storageBucket: 'dummy-project.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef',
};

// サンプル動画データ
const sampleVideos = [
  {
    videoId: 'sample-video-1',
    title: '【サンプル】涼花みなせの自己紹介動画',
    description: 'これはサンプルの説明文です。実際の動画とは異なります。',
    publishedAt: new Date('2025-04-01'),
    thumbnailUrl: 'https://i.ytimg.com/vi/sample-video-1/maxresdefault.jpg',
    channelId: 'UChiMMOhl6FpzjoRqvZ5rcaA',
    channelTitle: '涼花みなせ / Suzuka Minase',
    lastFetchedAt: new Date(),
  },
  {
    videoId: 'sample-video-2',
    title: '【サンプル】涼花みなせの歌ってみた',
    description: 'これはサンプルの説明文です。実際の動画とは異なります。\n\n複数行の説明文のテスト。',
    publishedAt: new Date('2025-04-10'),
    thumbnailUrl: 'https://i.ytimg.com/vi/sample-video-2/maxresdefault.jpg',
    channelId: 'UChiMMOhl6FpzjoRqvZ5rcaA',
    channelTitle: '涼花みなせ / Suzuka Minase',
    lastFetchedAt: new Date(),
  },
  {
    videoId: 'sample-video-3',
    title: '【サンプル】涼花みなせのゲーム実況',
    description: 'これはサンプルの説明文です。実際の動画とは異なります。',
    publishedAt: new Date('2025-04-20'),
    thumbnailUrl: 'https://i.ytimg.com/vi/sample-video-3/maxresdefault.jpg',
    channelId: 'UChiMMOhl6FpzjoRqvZ5rcaA',
    channelTitle: '涼花みなせ / Suzuka Minase',
    lastFetchedAt: new Date(),
  },
];

async function seedFirestore() {
  console.log('Firestoreエミュレーターにサンプルデータを追加します...');

  // Firebaseアプリの初期化
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // Firestoreエミュレーターに接続
  connectFirestoreEmulator(db, 'localhost', 8080);

  try {
    // サンプル動画データの追加
    const videosCollection = collection(db, 'videos');
    
    for (const video of sampleVideos) {
      const videoRef = doc(videosCollection, video.videoId);
      
      // TimestampオブジェクトをFirestoreのTimestampに変換
      const firestoreData = {
        ...video,
        publishedAt: Timestamp.fromDate(video.publishedAt),
        lastFetchedAt: Timestamp.fromDate(video.lastFetchedAt),
      };
      
      await setDoc(videoRef, firestoreData);
      console.log(`動画データを追加しました: ${video.title}`);
    }

    console.log('サンプルデータの追加が完了しました！');
  } catch (error) {
    console.error('サンプルデータの追加中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
seedFirestore();