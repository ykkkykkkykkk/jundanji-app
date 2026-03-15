---
name: api_endpoint_map
description: Mapping of src/api/index.js functions to server route files and endpoints
type: reference
---

## Core
| Client Function | Endpoint | Server File |
|---|---|---|
| getFlyers() | GET /api/flyers | routes/flyers.js |
| getFlyerDetail(id) | GET /api/flyers/:id | routes/flyers.js |
| createFlyer() | POST /api/flyers | routes/flyers.js |
| getCategories() | GET /api/flyers/categories | routes/flyers.js |

## Auth
| Client Function | Endpoint | Server File |
|---|---|---|
| register() | POST /api/auth/register | routes/auth.js |
| login() | POST /api/auth/login | routes/auth.js |
| getMe() | GET /api/users/me | routes/auth.js |
| updateNickname() | PATCH /api/users/me | routes/auth.js |
| updateUserRole() | PATCH /api/users/me/role | routes/auth.js |
| getUserPoints() | GET /api/users/:id/points | routes/auth.js |
| getUserShareHistory() | GET /api/users/:id/share-history | routes/auth.js |

## Points / Share
| Client Function | Endpoint | Server File |
|---|---|---|
| shareFlyer() | POST /api/share | routes/share.js |
| usePoints() | POST /api/points/use | routes/share.js |
| getPointHistory() | GET /api/users/:id/point-history | routes/auth.js |

## Quiz
| Client Function | Endpoint | Server File |
|---|---|---|
| registerQuizzes() | POST /api/flyers/:id/quizzes | routes/quiz.js |
| getRandomQuiz() | GET /api/flyers/:id/quiz | routes/quiz.js |
| submitQuizAnswer() | POST /api/quiz/attempt | routes/quiz.js |
| getQuizHistory() | GET /api/users/:id/quiz-history | routes/quiz.js |

## QR
| Client Function | Endpoint | Server File |
|---|---|---|
| generateQrCode() | POST /api/flyers/:id/qr/generate | routes/qr.js |
| getQrCode() | GET /api/flyers/:id/qr | routes/qr.js |
| verifyQrCode() | POST /api/qr/verify | routes/qr.js |
| getVisitHistory() | GET /api/users/:id/visit-history | routes/qr.js |

## Gift / Exchange
| Client Function | Endpoint | Server File |
|---|---|---|
| createGiftOrder() | POST /api/gift-orders | routes/gift.js |
| getGiftOrders() | GET /api/users/:id/gift-orders | routes/gift.js |
| createExchangeRequest() | POST /api/exchange/request | routes/exchange.js |

## Security
| Client Function | Endpoint | Server File |
|---|---|---|
| checkDevice() | POST /api/security/device-check | routes/security.js |
| registerDevice() | POST /api/security/device | routes/security.js |
| startScratchSession() | POST /api/scratch/start | routes/security.js |
| completeScratchSession() | POST /api/scratch/complete | routes/security.js |

## MISSING (in TASK.md but not implemented)
- requestWithdrawal → POST /api/withdrawals (no route file, not in app.js)
- getWithdrawalHistory → GET /api/users/:id/withdrawals (missing)
- getBanks → GET /api/banks (missing)
- withdrawals table missing from db.js schema
