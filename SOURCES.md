# CyberPi 3D 자료 조사 및 사용 기록

확인일: 2026-11-24. 검색·파일 접근 성공과 모델 데이터 확보를 구분합니다.

## 실제 3D 페이지와 원본 구매처

| 출처 | 확인 결과 | 이번 프로젝트 사용 |
|---|---|---|
| [Sketchfab: mBot 2 CyberPi card and its box](https://sketchfab.com/3d-models/mbot-2-cyberpi-card-and-its-box-2394095edcdd4f71b54718f437264f92) | 제작자 Sitetechno.fr. 공개 모델 API에서 `isDownloadable:false`, `license:Standard`, 애니메이션 없음 확인. 일반 페이지는 조사 도구에서 403 응답 | 공개 썸네일을 내려받아 외형·3층 분해 구조를 직접 대조. 원본 메시 다운로드·추출 안 함 |
| [Sketchfab 공식 임베드](https://sketchfab.com/models/2394095edcdd4f71b54718f437264f92/embed) | 위 모델의 임베드 URL | 링크만 기록. 임베드 재생 미검증 |
| [Sitetechno: mBot 3D files](https://www.sitetechno.fr/fichiers_3d/mbot.html) | CyberPi mBot2 단품 표시 가격 €6. SolidWorks 2022 + STEP. 모델 임베드 ID가 위 Sketchfab과 일치. 구매 후 이메일로 링크 전달 | 유료 원본 확보 후보. 미구매. 공개 재배포 허용 미확인 |
| [제작자 모델 소개 영상](https://youtube.com/shorts/a3EhKOcmri4) | 모델 설명에 연결된 영상 | 링크 확인. 영상 시청·다운로드·3D 추출 안 함 |

## 제조사 자료

| 출처 | 용도와 확인 결과 |
|---|---|
| [What is CyberPi](https://support.makeblock.com/hc/en-us/articles/7047875941399-What-is-CyberPi) | 외형 치수 84×35×13 mm, 기기 부품 안내, RGB LED 5개 등 확인. 재구성 모델의 외형 근거 |
| [제조사 부품 이미지](https://support.makeblock.com/hc/article_attachments/7047825012247) | `source/official-components.png`로 보존하고 직접 시각 대조. 모델의 조이스틱·A/B·화면·센서·마이크·홈·USB·전면 LED·스피커 배치 참고 |
| [제조사 치수 도면](https://support.makeblock.com/hc/article_attachments/7047823035031) | `source/official-dimensions.png`로 보존하고 직접 시각 확인. 도면에는 84×35×12.88 mm 표시 |
| [Case 7: Control the buttons](https://support.makeblock.com/hc/en-us/articles/13156183669783-Case-7-Control-the-buttons) | 예제 프로그램 업로드 후 A로 LED 켜기, B로 끄기. 웹 시연 로직의 근거. 실물 실험은 미실시 |
| [CyberPi 소개 영상](https://www.youtube.com/watch?v=s004xBcasJU) | xTool Education 채널의 기기 소개. 페이지·설명 확인. 영상에서 형상 추출하지 않음 |
| [공식 Quick Start 영상 안내](https://support.makeblock.com/hc/en-us/articles/7048756222743--Video-CyberPi-Quick-Start-Guide) | 후속 사용법 영상 구성용 공식 참고 링크. 이번 작업에서 재생·촬영·편집하지 않음 |
| [제조사 오픈소스 자료](https://www.yuque.com/makeblock-help-center-en/cyberpi/open-source) | 제조사 [mBot2 페이지](https://www.makeblock.com/pages/mbot2-coding-robot)의 Open-source Materials 링크로 출처 확인. 조사 도구에서 403 또는 로그인 필요 |
| [동일 문서의 제3자 미러](https://geekdaxue.co/read/makeblock-help-center-en@cyberpi/open-source) | CyberPi STEP·RAR 원본 링크 및 하드웨어/문서 라이선스 표기 확인. 로컬 `source/open-source-mirror.html`은 조사 기록 |
| [OSHWA 인증 CN000007](https://certification.oshwa.org/cn000007.html) | CyberPi의 오픈소스 하드웨어 인증. 연결 문서는 동일 Yuque |

## 원본 3D 파일 접근 결과

| 주소 | 결과 |
|---|---|
| `https://www.mblock.cc/doc/en/hardware-guide/cyberpi/CyberPi.stp` | 실제 GET 404. 원본 확보 실패 |
| `https://www.yuque.com/attachments/yuque/0/2020/rar/757912/1601193185214-54237a92-5614-4df9-9e7a-7af5d1aebce7.rar` | 로그인으로 302. 메타데이터 크기는 695,069바이트이나 파일 내부 미확인 |
| `https://cdn.nlark.com/yuque/0/2020/rar/757912/1601193185214-54237a92-5614-4df9-9e7a-7af5d1aebce7.rar` | 403 AccessDenied. 인증 우회하지 않음 |
| [2021-08-03 Wayback STEP 캡처](https://web.archive.org/web/20210803164933id_/https://www.mblock.cc/doc/en/hardware-guide/cyberpi/CyberPi.stp) | 응답 200이지만 `content truncated by length`. 원본 4,427,654바이트 중 1,048,576바이트만 보관. 불완전 파일로 판단하여 모델 제작에 사용하지 않음 |
| mblock zh-cn/zh-tw 대응 경로, docs.makeblock.com 경로 | 404 |
| 옛 education.makeblock.com 경로 | 현재 홈페이지 HTML로 이동. 모델 파일 아님 |

문서에는 Hardware CERN-OHL-P v2, Software GPL v3, Documentation CC BY-SA 4.0 표기가 있습니다. 다만 개별 모델 파일 내부를 확인하지 못했으므로 해당 CAD 파일의 정확한 적용 조건은 확정하지 않았습니다.

## 제외한 동명이물·부품

- Printables의 “CyberPi - raspberry pi 5 powered cyberdeck”: Raspberry Pi 기반 다른 제품.
- GitHub `amino47/CybeRPI`: Makeblock CyberPi 본체 모델과 무관.
- Eduscol CyberPi STL: 로봇 섀시 중심으로, CyberPi 본체 대체 모델로 확인하지 못함.
- Sketchfab·GitHub·GrabCAD·Thingiverse·Printables 검색에서 무료 다운로드와 재사용 조건까지 확인되는 CyberPi 본체 완전 모델은 확보하지 못함. 이는 인터넷 전체에 모델이 없다는 뜻은 아님.

## 제작물의 출처 구분

`tools/build_model.py`와 그 결과 `.blend`·`.glb`는 위 공식 치수·부품 자료와 판매 모델의 공개 미리보기를 대조해 새로 작성한 상세 재구성입니다. 기존 3D 페이지 소스를 복사하거나 영상의 프레임을 3D 데이터로 변환한 결과가 아닙니다. 내부 회로와 세부 곡면은 이미지 기반 추정이 포함되며 정밀 제조용으로 검증하지 않았습니다.

공개 판매 미리보기 파일과 정확한 이미지 URL·관찰 기록은 `source/reference-visual-notes.txt`에 있습니다. 제작자가 Sketchfab에서 색상·투명도가 표시되지 않는다고 설명하므로 미리보기의 흰색 케이스 재질을 실물 재질로 오인하지 않고, 제조사 반투명 검정 표현을 참조했습니다.
