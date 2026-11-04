# GEM Consult — planificateur : déclenche les tâches du site (actualité, veille IA, repères, échéances)
FROM alpine:3.20
RUN apk add --no-cache curl tzdata
COPY crontab.template /etc/gem/crontab.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
